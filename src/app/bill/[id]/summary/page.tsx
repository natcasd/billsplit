'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Session } from '@/types';
import { calculateParticipantBreakdown, formatCurrency } from '@/lib/calculations';
import PaymentBreakdown from '@/components/PaymentBreakdown';

export default function BillSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/sessions/${params.id}`);
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
  }, [params.id]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error || !session) {
    return <div className="text-red-500">{error || 'Session not found'}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Bill Summary</h1>
      <div className="space-y-6">
        {session.participants.map((participant) => (
          <PaymentBreakdown
            key={participant.id}
            bill={session.bill}
            participant={participant}
            allSelections={session.selections}
          />
        ))}
      </div>
    </div>
  );
} 