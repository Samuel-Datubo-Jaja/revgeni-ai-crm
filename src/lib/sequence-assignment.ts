import { prisma } from './prisma';

export async function assignCompanyToSequence(
  companyId: string,
  sequenceId: string,
  orgId: string
) {
  try {
    console.log('🔗 Starting assignment:', { companyId, sequenceId, orgId });
    
    // Validate inputs
    if (!companyId || !sequenceId || !orgId) {
      throw new Error('Missing required fields');
    }

    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error(`Company ${companyId} not found`);
    }

    console.log('✅ Found company:', company.name);

    // Check if sequence exists
    const sequence = await prisma.emailSequence.findUnique({
      where: { id: sequenceId },
    });

    if (!sequence) {
      throw new Error(`Email sequence ${sequenceId} not found`);
    }

    console.log('✅ Found sequence:', sequence.name);

    // Check if assignment already exists
    const existing = await prisma.companySequence.findFirst({
      where: {
        companyId,
        sequenceId,
      },
    });

    if (existing) {
      console.log('⚠️ Assignment already exists:', existing.id, 'Status:', existing.status);
      return existing;
    }

    // Create new assignment
    const assignment = await prisma.companySequence.create({
      data: {
        companyId,
        sequenceId,
        orgId,
        currentStep: 0,
        status: 'active',
        startedAt: new Date(),
        nextSendAt: new Date(), // Send first email immediately
      },
    });

    console.log('✅ Assignment created successfully!');
    console.log('   - Assignment ID:', assignment.id);
    console.log('   - Company:', company.name);
    console.log('   - Sequence:', sequence.name);
    console.log('   - Next send:', assignment.nextSendAt);
    
    return assignment;
    
  } catch (error: any) {
    console.error('❌ Assignment failed:', error.message);
    throw error;
  }
}

// Bonus: Function to remove company from sequence
export async function removeCompanyFromSequence(
  companyId: string,
  sequenceId: string
) {
  return await prisma.companySequence.updateMany({
    where: {
      companyId,
      sequenceId,
    },
    data: {
      status: 'paused',
    },
  });
}