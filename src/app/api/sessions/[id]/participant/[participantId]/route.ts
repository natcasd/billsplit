import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  const resolvedParams = await params;
  try {
    const { selectedItems } = await request.json();
    
    // Get current selections
    const selections = await redis.hget(`session:${resolvedParams.id}`, 'selections');
    if (!selections) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Update selections object
    const selectionsObj = JSON.parse(selections);
    selectionsObj[resolvedParams.participantId] = selectedItems;
    
    // Update the entire selections object
    await redis.hset(`session:${resolvedParams.id}`, 'selections', JSON.stringify(selectionsObj));
    
    // Ensure expiration is maintained
    await redis.expire(`session:${resolvedParams.id}`, 3600);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating participant selection:', error);
    return NextResponse.json({ error: 'Failed to update selection' }, { status: 500 });
  }
} 