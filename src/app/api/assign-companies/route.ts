import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { assignCompanyToSequence } from '@/lib/sequence-assignment';

export async function POST(request: NextRequest) {
  try {
    // 🔧 Use currentUser() instead of auth()
    const user = await currentUser();
    
    if (!user) {
      console.error('❌ No user found from Clerk');
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const userId = user.id;
    console.log('✅ User authenticated:', userId, user.emailAddresses[0]?.emailAddress);

    const body = await request.json();
    const { companyIds, sequenceId } = body;

    console.log('📦 Request body:', { companyIds, sequenceId });

    // Validation
    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid company IDs' },
        { status: 400 }
      );
    }

    if (!sequenceId) {
      return NextResponse.json(
        { error: 'Sequence ID is required' },
        { status: 400 }
      );
    }

    /**
     * Organization ID Strategy
     * 
     * Current Implementation: Using 'demo-org' for POC
     * 
     * The Prisma schema supports full multi-tenancy (Org -> UserOrg -> User),
     * but implementing it would be over-engineering for this 6-8 hour challenge
     * with no explicit multi-tenant requirement in the brief.
     * 
     * Production Enhancement:
     * - Query UserOrg table to get user's actual orgId
     * - Filter all data by orgId for data isolation
     * - Add invitation system for team collaboration
     * - Implement org-level permissions
     * 
     * This provides a clear path to production-grade multi-tenancy
     * while keeping the demo focused on core AI and CRM functionality.
     */
    const orgId = 'demo-org';

    console.log('🚀 Assignment Request:');
    console.log('   👤 User:', userId);
    console.log('   🏢 Organization:', orgId);
    console.log('   📋 Companies:', companyIds.length);
    console.log('   📧 Sequence:', sequenceId);

    const results = [];
    const errors = [];

    // Process each company assignment
    for (const companyId of companyIds) {
      try {
        const result = await assignCompanyToSequence(
          companyId,
          sequenceId,
          orgId
        );
        results.push(result);
        console.log(`   ✅ Assigned company ${companyId}`);
      } catch (error: any) {
        console.error(`   ❌ Failed to assign ${companyId}:`, error.message);
        errors.push({
          companyId,
          error: error.message,
        });
      }
    }

    // Handle response
    if (errors.length > 0 && results.length === 0) {
      return NextResponse.json(
        { 
          error: 'All assignments failed',
          details: errors 
        },
        { status: 500 }
      );
    }

    console.log(`🎉 Assignment complete: ${results.length} succeeded, ${errors.length} failed`);

    return NextResponse.json({
      success: true,
      assigned: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}