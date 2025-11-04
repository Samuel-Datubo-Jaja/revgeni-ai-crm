import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('🔄 Starting email cron job...');
    
    // 1. Find all emails that should be sent today
    const emailsToSend = await findEmailsDueToday();
    
    console.log(`📧 Found ${emailsToSend.length} emails to send`);
    
    // 2. Send each one
    let sentCount = 0;
    let errorCount = 0;
    
    for (const emailData of emailsToSend) {
      try {
        await sendScheduledEmail(emailData);
        await updateNextSendDate(emailData);
        sentCount++;
        console.log(`✅ Sent email to ${emailData.company.name}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to send email to ${emailData.company.name}:`, error);
        
        // Log error to database
        await prisma.outboxEmail.create({
          data: {
            orgId: emailData.orgId,
            sequenceId: emailData.sequenceId,
            companyId: emailData.companyId,
            stepIndex: emailData.currentStep,
            scheduledAt: new Date(),
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }
    
    console.log(`🎯 Cron job completed: ${sentCount} sent, ${errorCount} failed`);
    
    return NextResponse.json({
      success: true,
      processed: emailsToSend.length,
      sent: sentCount,
      failed: errorCount,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// Helper function: Find emails due today
async function findEmailsDueToday() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return await prisma.companySequence.findMany({
    where: {
      status: 'active',
      nextSendAt: {
        gte: today,
        lt: tomorrow,
      },
    },
    include: {
      company: {
        include: {
          people: {
            take: 1, // Get primary contact
          },
        },
      },
      sequence: true,
      org: true,
    },
  });
}

// Helper function: Send the actual email
async function sendScheduledEmail(emailData: any) {
  const { company, sequence, currentStep, org } = emailData;
  
  // Parse the sequence steps
  const steps = JSON.parse(sequence.steps);
  const currentStepData = steps[currentStep];
  
  if (!currentStepData) {
    throw new Error(`Step ${currentStep} not found in sequence`);
  }
  
  // Get primary contact email
  const primaryContact = company.people[0];
  const contactEmail = primaryContact?.email || `info@${company.domain}`;
  const contactName = primaryContact?.fullName || 'Team';
  
  // Use your existing email API
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: contactEmail,
      subject: currentStepData.subject,
      body: currentStepData.body,
      fromName: sequence.fromName || 'Sales Team',
      companyName: company.name,
      contactName: contactName,
      industry: company.industry || 'Technology',
      delayDays: 0, // Already scheduled
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to send email');
  }
  
  return response.json();
}

// Helper function: Update next send date
async function updateNextSendDate(emailData: any) {
  const { id, sequence, currentStep } = emailData;
  
  // Parse the sequence steps
  const steps = JSON.parse(sequence.steps);
  const nextStepIndex = currentStep + 1;
  
  if (nextStepIndex >= steps.length) {
    // Sequence completed
    await prisma.companySequence.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        nextSendAt: null,
      },
    });
  } else {
    // Schedule next step
    const nextStep = steps[nextStepIndex];
    const nextSendDate = new Date();
    nextSendDate.setDate(nextSendDate.getDate() + nextStep.delay);
    
    await prisma.companySequence.update({
      where: { id },
      data: {
        currentStep: nextStepIndex,
        nextSendAt: nextSendDate,
      },
    });
  }
}