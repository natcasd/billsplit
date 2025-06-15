import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const redis = new Redis(process.env.REDIS_URL!);

export async function POST(request: NextRequest) {
  try {
    const { bill } = await request.json();
    const sessionId = uuidv4();
    
    // Store bill data and empty selections using HSET
    await redis.hset(`session:${sessionId}`, {
      'bill': JSON.stringify(bill),
      'selections': JSON.stringify({})
    });
    
    // Set 1 hour expiration
    await redis.expire(`session:${sessionId}`, 3600);
    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
} 