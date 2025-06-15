"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { BillItem, Bill } from "@/types";
import { formatCurrency, calculateItemSplit, calculateTaxOwed, calculateTipOwed } from "@/lib/calculations";

export default function BillSelectionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [items, setItems] = useState<BillItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState<string>('');
  const [allSelections, setAllSelections] = useState<Record<string, string[]>>({});
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [billDetails, setBillDetails] = useState<{
    tax: number;
    tip: number;
    taxDistribution: 'equal' | 'proportional';
    tipDistribution: 'equal' | 'proportional';
    restaurantName?: string;
  }>({
    tax: 0,
    tip: 0,
    taxDistribution: 'equal',
    tipDistribution: 'equal'
  });

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/sessions/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch session');
      }
      const data = await response.json();
      setItems(data.bill.items);
      setBillDetails({
        tax: data.bill.tax,
        tip: data.bill.tip,
        taxDistribution: data.bill.taxDistribution,
        tipDistribution: data.bill.tipDistribution,
        restaurantName: data.bill.restaurantName
      });
      
      // Get participant ID from URL
      const participantId = searchParams.get('participantId');
      if (!participantId) {
        throw new Error('No participant ID provided');
      }

      // Find the current participant's data
      const currentParticipant = data.participants.find((p: any) => p.id === participantId);
      if (currentParticipant) {
        setParticipantName(currentParticipant.name);
      }

      // Create a map of participant names
      const namesMap = data.participants.reduce((acc: Record<string, string>, p: any) => {
        acc[p.id] = p.name;
        return acc;
      }, {});
      setParticipantNames(namesMap);
      
      setAllSelections(data.selections || {});
      
      // Get current selections for this participant
      const selections = data.selections || {};
      if (selections[participantId]) {
        setSelectedItems(selections[participantId]);
        // Calculate initial subtotal
        const initialSubtotal = data.bill.items
          .filter((item: BillItem) => selections[participantId].includes(item.id))
          .reduce((sum: number, item: BillItem) => sum + (item.price * item.quantity), 0);
        setSubtotal(initialSubtotal);
      }
      
      setIsLoading(false);
    } catch (err) {
      setError('Failed to load bill items');
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchSession();
  }, [params.id, searchParams.get('participantId')]);

  // Poll for updates every 2 seconds
  useEffect(() => {
    const interval = setInterval(fetchSession, 2000);
    return () => clearInterval(interval);
  }, [params.id]);

  const handleItemToggle = async (itemId: string) => {
    const participantId = searchParams.get('participantId');
    if (!participantId) {
      setError('No participant ID provided');
      return;
    }

    // Optimistically update UI
    const newSelected = selectedItems.includes(itemId)
      ? selectedItems.filter(id => id !== itemId)
      : [...selectedItems, itemId];
    
    setSelectedItems(newSelected);

    // Optimistically update subtotal
    const newSubtotal = items
      .filter(item => newSelected.includes(item.id))
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setSubtotal(newSubtotal);

    // Optimistically update allSelections
    const updatedSelections = { ...allSelections };
    updatedSelections[participantId] = newSelected;
    setAllSelections(updatedSelections);

    // Save to server
    setIsSaving(true);
    try {
      const response = await fetch(`/api/sessions/${params.id}/participant/${participantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selectedItems: newSelected }),
      });

      if (!response.ok) {
        throw new Error('Failed to save selections');
      }
    } catch (err) {
      // Revert optimistic updates on error
      setSelectedItems(selectedItems);
      setSubtotal(subtotal);
      setAllSelections(allSelections);
      setError('Failed to save selections. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Function to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Function to get participants who selected an item
  const getItemParticipants = (itemId: string) => {
    return Object.entries(allSelections)
      .filter(([_, items]) => items.includes(itemId))
      .map(([participantId]) => ({
        id: participantId,
        name: participantNames[participantId] || ''
      }))
      .filter(participant => participant.name); // Only include participants with names
  };

  // Calculate total balance
  const calculateTotalBalance = () => {
    const itemSplits = selectedItems.map(itemId => {
      const item = items.find(i => i.id === itemId);
      if (!item) return 0;
      const itemParticipants = getItemParticipants(itemId).length;
      return calculateItemSplit(item, itemParticipants);
    });

    const billSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const session = {
      bill: {
        items,
        subtotal: billSubtotal,
        total: billSubtotal + billDetails.tax + billDetails.tip,
        tax: billDetails.tax,
        tip: billDetails.tip,
        taxDistribution: billDetails.taxDistribution,
        tipDistribution: billDetails.tipDistribution
      },
      selections: allSelections,
      participants: Object.entries(allSelections).map(([id, selectedItems]) => {
        const participantItems = items.filter(item => selectedItems.includes(item.id));
        const participantSubtotal = participantItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const taxShare = billDetails.taxDistribution === 'equal' 
          ? billDetails.tax / Object.keys(allSelections).length
          : (participantSubtotal / billSubtotal) * billDetails.tax;
        const tipShare = billDetails.tipDistribution === 'equal'
          ? billDetails.tip / Object.keys(allSelections).length
          : (participantSubtotal / billSubtotal) * billDetails.tip;
        
        return {
          id,
          selectedItems,
          name: participantNames[id] || '',
          subtotal: participantSubtotal,
          tax: taxShare,
          tip: tipShare,
          total: participantSubtotal + taxShare + tipShare
        };
      })
    };

    const taxShare = calculateTaxOwed(session, subtotal);
    const tipShare = calculateTipOwed(session, subtotal);

    return itemSplits.reduce((sum, split) => sum + split, 0) + taxShare + tipShare;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading bill...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-500"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {billDetails && billDetails.restaurantName && (
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{billDetails.restaurantName}</h1>
        )}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {participantName ? `${participantName}, select your items` : 'Select Your Items'}
        </h1>
        <div className="space-y-4">
          {items.map((item) => {
            const itemParticipants = getItemParticipants(item.id);
            const itemSplit = calculateItemSplit(item, itemParticipants.length);
            return (
              <div
                key={item.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors duration-200 ${
                  selectedItems.includes(item.id) ? 'bg-blue-50 border-blue-500' : 'bg-white hover:bg-gray-50'
                } ${isSaving ? 'opacity-75' : ''}`}
                onClick={() => handleItemToggle(item.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-gray-600">{formatCurrency(item.price)}</p>
                    {selectedItems.includes(item.id) && (
                      <p className="text-sm text-green-600">
                        Your share: {formatCurrency(itemSplit)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.quantity > 1 && (
                      <span className="text-sm text-gray-500">x{item.quantity}</span>
                    )}
                    {itemParticipants.length > 0 && (
                      <div className="flex -space-x-2">
                        {itemParticipants.map((participant) => (
                          <div
                            key={participant.id}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
                            style={{ backgroundColor: stringToColor(participant.id) }}
                            title={participant.name}
                          >
                            {getInitials(participant.name)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-2">
          {selectedItems.length > 0 && (
            <>
              <h3 className="font-medium mb-2">Your Breakdown:</h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Items Total:</span>
                  <span>{formatCurrency(selectedItems.reduce((sum, itemId) => {
                    const item = items.find(i => i.id === itemId);
                    if (!item) return sum;
                    const itemParticipants = getItemParticipants(itemId).length;
                    return sum + ((item.price * item.quantity) / itemParticipants);
                  }, 0))}</span>
                </div>
                {billDetails.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tax ({billDetails.taxDistribution}): {formatCurrency(billDetails.tax)} × {(billDetails.taxDistribution === 'equal' ? 1/Object.keys(allSelections).length : subtotal/items.reduce((sum, item) => sum + (item.price * item.quantity), 0)).toFixed(2)}</span>
                    <span>{formatCurrency(calculateTaxOwed({
                      bill: {
                        items,
                        subtotal: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                        total: items.reduce((sum, item) => sum + (item.price * item.quantity), 0) + billDetails.tax + billDetails.tip,
                        tax: billDetails.tax,
                        tip: billDetails.tip,
                        taxDistribution: billDetails.taxDistribution,
                        tipDistribution: billDetails.tipDistribution
                      },
                      selections: allSelections,
                      participants: Object.entries(allSelections).map(([id, selectedItems]) => {
                        const participantItems = items.filter(item => selectedItems.includes(item.id));
                        const participantSubtotal = participantItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                        const taxShare = billDetails.taxDistribution === 'equal' 
                          ? billDetails.tax / Object.keys(allSelections).length
                          : (participantSubtotal / items.reduce((sum, item) => sum + (item.price * item.quantity), 0)) * billDetails.tax;
                        const tipShare = billDetails.tipDistribution === 'equal'
                          ? billDetails.tip / Object.keys(allSelections).length
                          : (participantSubtotal / items.reduce((sum, item) => sum + (item.price * item.quantity), 0)) * billDetails.tip;
                        
                        return {
                          id,
                          selectedItems,
                          name: participantNames[id] || '',
                          subtotal: participantSubtotal,
                          tax: taxShare,
                          tip: tipShare,
                          total: participantSubtotal + taxShare + tipShare
                        };
                      })
                    }, subtotal))}</span>
                  </div>
                )}
                {billDetails.tip > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tip ({billDetails.tipDistribution}): {formatCurrency(billDetails.tip)} × {(billDetails.tipDistribution === 'equal' ? 1/Object.keys(allSelections).length : subtotal/items.reduce((sum, item) => sum + (item.price * item.quantity), 0)).toFixed(2)}</span>
                    <span>{formatCurrency(calculateTipOwed({
                      bill: {
                        items,
                        subtotal: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                        total: items.reduce((sum, item) => sum + (item.price * item.quantity), 0) + billDetails.tax + billDetails.tip,
                        tax: billDetails.tax,
                        tip: billDetails.tip,
                        taxDistribution: billDetails.taxDistribution,
                        tipDistribution: billDetails.tipDistribution
                      },
                      selections: allSelections,
                      participants: Object.entries(allSelections).map(([id, selectedItems]) => {
                        const participantItems = items.filter(item => selectedItems.includes(item.id));
                        const participantSubtotal = participantItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                        const taxShare = billDetails.taxDistribution === 'equal' 
                          ? billDetails.tax / Object.keys(allSelections).length
                          : (participantSubtotal / items.reduce((sum, item) => sum + (item.price * item.quantity), 0)) * billDetails.tax;
                        const tipShare = billDetails.tipDistribution === 'equal'
                          ? billDetails.tip / Object.keys(allSelections).length
                          : (participantSubtotal / items.reduce((sum, item) => sum + (item.price * item.quantity), 0)) * billDetails.tip;
                        
                        return {
                          id,
                          selectedItems,
                          name: participantNames[id] || '',
                          subtotal: participantSubtotal,
                          tax: taxShare,
                          tip: tipShare,
                          total: participantSubtotal + taxShare + tipShare
                        };
                      })
                    }, subtotal))}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                  <span>Your Total:</span>
                  <span>{formatCurrency(calculateTotalBalance())}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF)
    .toString(16)
    .toUpperCase();
  return `#${'00000'.substring(0, 6 - c.length)}${c}`;
} 