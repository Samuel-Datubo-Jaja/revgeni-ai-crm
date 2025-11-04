import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('📧 Fetching email sequences...');
    
    const sequences = await prisma.emailSequence.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`✅ Found ${sequences.length} email sequences`);
    
    return NextResponse.json(sequences);
  } catch (error) {
    console.error('❌ Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sequences' }, 
      { status: 500 }
    );
  }
}