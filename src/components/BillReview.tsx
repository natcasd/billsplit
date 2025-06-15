import { useState, useEffect } from 'react';
import { Bill, BillItem } from '@/types';
import EditableItem from './EditableItem';
import { useParams } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';

interface BillReviewProps {
  initialBill: Bill;
  onSave: (bill: Bill) => Promise<void>;
}

export default function BillReview({ initialBill, onSave }: BillReviewProps) {
  const [bill, setBill] = useState<Bill>(initialBill);
  const [isSaving, setIsSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [isReextracting, setIsReextracting] = useState(false);
  const [reextractError, setReextractError] = useState<string | null>(null);
  const params = useParams();
  const billId = (params && (params as any).id) || (initialBill as any).id;

  const handleItemUpdate = (updatedItem: BillItem) => {
    setBill(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      )
    }));
  };

  const handleItemDelete = (itemId: string) => {
    setBill(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const handleAddItem = () => {
    const newItem: BillItem = {
      id: crypto.randomUUID(),
      name: 'New Item',
      price: 0,
      quantity: 1
    };
    setBill(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const handleDistributionChange = (type: 'tax' | 'tip', value: 'equal' | 'proportional') => {
    setBill(prev => ({
      ...prev,
      [`${type}Distribution`]: value
    }));
  };

  const handleAmountChange = (type: 'tax' | 'tip', value: string) => {
    const numValue = parseFloat(value) || 0;
    setBill(prev => ({
      ...prev,
      [type]: numValue
    }));
  };

  const subtotal = bill.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal + bill.tax + bill.tip;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        ...bill,
        subtotal,
        total
      });
    } catch (error) {
      console.error('Error saving bill:', error);
      // TODO: Add error handling UI
    } finally {
      setIsSaving(false);
    }
  };

  const handleReextract = async () => {
    setIsReextracting(true);
    setReextractError(null);
    try {
      // Get the stored image from localStorage
      const storedImage = localStorage.getItem(`bill_image_${billId}`);
      if (!storedImage) {
        throw new Error('No receipt image found');
      }
      // Convert base64 to blob
      const base64Data = storedImage.split(',')[1];
      const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(res => res.blob());
      // Create FormData and append image
      const formData = new FormData();
      formData.append('image', blob, 'receipt.jpg');
      if (userPrompt) formData.append('userPrompt', userPrompt);
      // Send to API
      const response = await fetch('/api/analyze-receipt', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Failed to analyze receipt');
      }
      const data = await response.json();
      setBill(data);
      setShowDialog(false);
      setUserPrompt('');
    } catch (err: any) {
      setReextractError(err.message || 'Failed to re-extract bill');
    } finally {
      setIsReextracting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Re-extract from Bill Modal */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <button
          className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-500"
          onClick={() => setShowDialog(true)}
          disabled={isReextracting}
        >
          Re-extract from Bill
        </button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-extract from Bill</DialogTitle>
            
          </DialogHeader>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Optional: Tell the model what it missed or should fix..."
            value={userPrompt}
            onChange={e => setUserPrompt(e.target.value)}
            disabled={isReextracting}
          />
          <DialogFooter>
            <button
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-500"
              onClick={handleReextract}
              disabled={isReextracting}
            >
              Submit
            </button>
          </DialogFooter>
          {isReextracting && <div className="text-gray-500 text-sm mt-2">Re-extracting...</div>}
          {reextractError && <div className="text-red-600 text-sm mt-2">{reextractError}</div>}
        </DialogContent>
      </Dialog>
      {bill.restaurantName && (
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{bill.restaurantName}</h1>
        </div>
      )}
      {/* Items List */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Items</h2>
          <button
            onClick={handleAddItem}
            className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-500"
          >
            Add Item
          </button>
        </div>
        <div className="space-y-2">
          {bill.items.map(item => (
            <EditableItem
              key={item.id}
              item={item}
              onUpdate={handleItemUpdate}
              onDelete={() => handleItemDelete(item.id)}
            />
          ))}
        </div>
      </div>

      {/* Tax and Tip Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Charges</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tax */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tax Amount
            </label>
            <div className="flex gap-4">
              <input
                type="number"
                value={bill.tax}
                onChange={(e) => handleAmountChange('tax', e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md"
                step="0.01"
                min="0"
              />
              <div className="flex items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={bill.taxDistribution === 'equal'}
                    onChange={() => handleDistributionChange('tax', 'equal')}
                    className="mr-2"
                  />
                  Equal
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={bill.taxDistribution === 'proportional'}
                    onChange={() => handleDistributionChange('tax', 'proportional')}
                    className="mr-2"
                  />
                  Proportional
                </label>
              </div>
            </div>
          </div>

          {/* Tip */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tip Amount
            </label>
            <div className="flex gap-4">
              <input
                type="number"
                value={bill.tip}
                onChange={(e) => handleAmountChange('tip', e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md"
                step="0.01"
                min="0"
              />
              <div className="flex items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={bill.tipDistribution === 'equal'}
                    onChange={() => handleDistributionChange('tip', 'equal')}
                    className="mr-2"
                  />
                  Equal
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={bill.tipDistribution === 'proportional'}
                    onChange={() => handleDistributionChange('tip', 'proportional')}
                    className="mr-2"
                  />
                  Proportional
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Total Section */}
        <div className="mt-6 pt-6 border-t">
          <div className="space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax</span>
              <span>${bill.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tip</span>
              <span>${bill.tip.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold border-t pt-2 mt-2">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-3 text-white bg-indigo-600 rounded-md hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Continue to Share'}
        </button>
      </div>
    </div>
  );
} 