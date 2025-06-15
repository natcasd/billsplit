'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Session } from '@/types';
import { formatCurrency, calculateParticipantBreakdown } from '@/lib/calculations';
import { QRCodeSVG } from 'qrcode.react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

export default function BillSharePage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/sessions/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch session');
        }
        const data = await response.json();
        setSession(data);
        // Generate share URL
        const url = `${window.location.origin}/join/${params.id}`;
        setShareUrl(url);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load session');
        setIsLoading(false);
      }
    };

    fetchSession();
    // Poll for updates every 2 seconds
    const interval = setInterval(fetchSession, 2000);
    return () => clearInterval(interval);
  }, [params.id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error || !session) {
    return <div className="text-red-500">{error || 'Session not found'}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Split {session?.bill.restaurantName}</h1>
      
      {/* Share Link Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Share with Others</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-3 py-2 border rounded-md bg-gray-50"
            />
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Copy
            </button>
          </div>
          <div className="flex justify-center p-4 bg-white rounded-lg">
            <QRCodeSVG value={shareUrl} size={200} />
          </div>
        </div>
      </div>

      {/* Entire Bill Accordion */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="entire-bill">
            <AccordionTrigger>
              <span className="text-xl font-semibold">
                Bill Details
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="mt-1 space-y-1">
                {session?.bill.items.map(item => (
                  <li key={item.id} className="flex justify-between text-sm">
                    <span>{item.name} × {item.quantity}</span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between text-sm mt-4">
                <span>Tax</span>
                <span>{formatCurrency(session?.bill.tax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tip</span>
                <span>{formatCurrency(session?.bill.tip)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2 mt-2 text-lg">
                <span>Total</span>
                <span>{formatCurrency(session?.bill.total)}</span>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Participant Totals */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Participant Totals</h2>
        <Accordion type="multiple" className="w-full">
          {session?.participants.map((participant) => {
            const breakdown = calculateParticipantBreakdown(session, participant, session.selections);
            return (
              <AccordionItem key={participant.id} value={participant.id}>
                <AccordionTrigger>
                  <div className="flex flex-1 items-center justify-between w-full">
                    <div>
                      <span className="font-medium">{participant.name}</span>
                      <span className="ml-2 text-sm text-gray-600">({participant.selectedItems.length} items selected)</span>
                    </div>
                    <span className="text-lg font-semibold">{formatCurrency(breakdown.totalOwed)}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{formatCurrency(breakdown.subtotalOwed)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax</span>
                      <span>{formatCurrency(breakdown.taxOwed)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tip</span>
                      <span>{formatCurrency(breakdown.tipOwed)}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <span className="font-medium">Items:</span>
                      <ul className="mt-1 space-y-1">
                        {breakdown.items.map((item) => (
                          <li key={item.id} className="flex justify-between text-xs">
                            <span>{item.name} × {item.quantity}</span>
                            <span>{formatCurrency(item.total)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      {/* Unselected Items Total */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="unselected-items">
            <AccordionTrigger>
              <div className="flex flex-1 items-center justify-between w-full">
                <span className="text-xl font-semibold">Unselected Items Total</span>
                <span className="text-2xl font-semibold">
                  {formatCurrency(session?.bill.items
                    .filter(item => !Object.values(session?.selections || {}).some(selectedItems => selectedItems.includes(item.id)))
                    .reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0)}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="mt-1 space-y-1">
                {session?.bill.items
                  .filter(item => !Object.values(session?.selections || {}).some(selectedItems => selectedItems.includes(item.id)))
                  .map(item => (
                    <li key={item.id} className="flex justify-between text-xs">
                      <span>{item.name} × {item.quantity}</span>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </li>
                  ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Action Button */}
      <div>
        <button
          onClick={() => router.push('/')}
          className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
        >
          Create New Bill
        </button>
      </div>
    </div>
  );
} 