import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const { name } = await request.json();
    const participantId = crypto.randomUUID();
    
    // Get current session data
    const sessionData = await redis.hgetall(`session:${resolvedParams.id}`);
    if (!sessionData) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Update selections and names
    const selections = JSON.parse(sessionData.selections || '{}');
    const names = JSON.parse(sessionData.names || '{}');
    
    selections[participantId] = [];
    names[participantId] = name;

    // Update Redis with new data
    await redis.hset(`session:${resolvedParams.id}`, {
      'selections': JSON.stringify(selections),
      'names': JSON.stringify(names)
    });
    
    // Ensure expiration is maintained
    await redis.expire(`session:${resolvedParams.id}`, 3600);
    
    return NextResponse.json({ participantId });
  } catch (error) {
    console.error('Error adding participant:', error);
    return NextResponse.json({ error: 'Failed to add participant' }, { status: 500 });
  }
} 