'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Session } from '@/types';
import { formatCurrency } from '@/lib/calculations';

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/sessions/${params.sessionId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch session');
        }
        const data = await response.json();
        setSession(data);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load session');
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [params.sessionId]);

  const handleJoin = async () => {
    if (!session || !name.trim()) return;
    
    try {
      // Create a new participant with the provided name
      const response = await fetch(`/api/sessions/${params.sessionId}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to join session');
      }

      const { participantId } = await response.json();
      router.push(`/bill/${params.sessionId}/select?participantId=${participantId}`);
    } catch (err) {
      setError('Failed to join session');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error || !session) {
    return <div className="text-red-500">{error || 'Session not found'}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Join Bill Split</h1>
      
      {/* Name Input */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Enter Your Name</h2>
        <div className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-3 py-2 border rounded-md"
          />
          <button
            onClick={handleJoin}
            disabled={!name.trim()}
            className={`w-full py-2 px-4 rounded-lg ${
              !name.trim()
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Join Bill
          </button>
        </div>
      </div>

      {/* Bill Overview */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Bill Overview</h2>
        {session.bill.restaurantName && (
          <div className="mb-2 text-gray-500 text-sm">Restaurant: {session.bill.restaurantName}</div>
        )}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Items</h3>
            <ul className="space-y-2">
              {session.bill.items.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span>{item.name} × {item.quantity}</span>
                  <span>{formatCurrency(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between mb-2">
              <span>Subtotal</span>
              <span>{formatCurrency(session.bill.subtotal)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Tax ({session.bill.taxDistribution})</span>
              <span>{formatCurrency(session.bill.tax)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Tip ({session.bill.tipDistribution})</span>
              <span>{formatCurrency(session.bill.tip)}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg border-t pt-2 mt-2">
              <span>Total</span>
              <span>{formatCurrency(session.bill.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 