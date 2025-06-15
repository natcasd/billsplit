import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';
import { Session, BillItem } from '@/types';

const redis = new Redis(process.env.REDIS_URL!);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const sessionId = resolvedParams.id;
  try {
    // Get all session data using HGETALL
    const sessionData = await redis.hgetall(`session:${sessionId}`);
    if (!sessionData || !sessionData.bill) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    const bill = JSON.parse(sessionData.bill);
    const selections = JSON.parse(sessionData.selections || '{}') as Record<string, string[]>;
    const names = JSON.parse(sessionData.names || '{}') as Record<string, string>;
    const numParticipants = Object.keys(selections).length || 1;
    
    // Transform selections into participants array
    const participants = Object.entries(selections).map(([participantId, selectedItems]) => {
      const items = bill.items.filter((item: BillItem) => selectedItems.includes(item.id));
      const subtotal = items.reduce((sum: number, item: BillItem) => sum + item.price * item.quantity, 0);
      let tax = 0, tip = 0;
      
      if (bill.taxDistribution === 'equal') {
        tax = bill.tax / numParticipants;
      } else {
        tax = (subtotal / bill.subtotal) * bill.tax;
      }
      
      if (bill.tipDistribution === 'equal') {
        tip = bill.tip / numParticipants;
      } else {
        tip = (subtotal / bill.subtotal) * bill.tip;
      }
      
      return {
        id: participantId,
        name: names[participantId] || `Participant ${participantId.slice(0, 4)}`,
        selectedItems,
        subtotal,
        tax,
        tip,
        total: subtotal + tax + tip
      };
    });
    
    return NextResponse.json({ bill, selections, participants });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
} 