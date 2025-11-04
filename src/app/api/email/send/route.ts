import { NextRequest, NextResponse } from 'next/server';
import { nango, replaceEmailVariables, encodeEmailForGmail } from '@/lib/nango';
import { auth } from '@clerk/nextjs/server';
import { addDays, formatEmailDelay, formatDateReadable } from '@/lib/date-utils';

export async function POST(request: NextRequest) {
  try {
    // Add auth back (but make it optional for testing)
    let userId = 'demo-user';
    let orgId = 'demo-org';
    
    try {
      const authResult = await auth();
      if (authResult.userId && authResult.orgId) {
        userId = authResult.userId;
        orgId = authResult.orgId;
      }
    } catch (authError) {
      console.log('👤 Using demo auth for email testing');
    }

    const body = await request.json();
    const { 
      to, 
      subject, 
      body: emailBody, 
      fromName = 'RevGeni CRM',
      companyName = 'Test Company',
      contactName = 'Test Contact',
      industry = 'Technology',
      delayDays = 0 // ← For scheduling
    } = body;

    console.log('📧 Email API called:', { to, subject, emailBody, fromName, userId, orgId });

    // Replace template variables
    const variables = { 
      company_name: companyName, 
      contact_name: contactName, 
      industry 
    };

    const processedSubject = replaceEmailVariables(subject || 'Test Subject', variables);
    const processedBody = replaceEmailVariables(emailBody || 'Test Body', variables);

    // Calculate scheduled time using date-utils
    const scheduledAt = delayDays > 0 ? addDays(new Date(), delayDays) : new Date();
    const scheduleMessage = formatEmailDelay(delayDays);

    console.log(`📅 ${scheduleMessage} - Scheduled for: ${scheduledAt.toISOString()}`);

    // Get user's connection ID dynamically
    const connectionId = await getUserConnectionId(userId);
    
    if (!connectionId) {
      throw new Error(`No Gmail connection found for user ${userId}`);
    }

    // Try to send real email via Nango
    if (nango) {
      try {
        console.log('🚀 Attempting real email via Nango...');

        // Create email content for Gmail API
        const emailContent = [
          `To: ${to}`,
          `Subject: ${processedSubject}`,
          `From: ${fromName} <noreply@revgeni.ai>`,
          'MIME-Version: 1.0',
          'Content-Type: text/plain; charset=utf-8',
          '',
          processedBody
        ].join('\r\n');

        const encodedEmail = encodeEmailForGmail(emailContent);

        // Send via Nango -> Gmail API
        const response = await nango.post({
          endpoint: '/gmail/v1/users/me/messages/send',
          providerConfigKey: 'google-mail',
          connectionId: connectionId, // ← Dynamic per user
          data: {
            raw: encodedEmail
          }
        });

        console.log('✅ Real email sent via Nango!', response.data);

        // Log to database with proper date handling
        try {
          const { prisma } = await import('@/lib/prisma');
          await prisma.outboxEmail.create({
            data: {
              orgId: orgId,
              sequenceId: 'test-sequence',
              stepIndex: 0,
              scheduledAt: scheduledAt, // ← Using calculated date
              status: 'sent',
              providerId: response.data?.id || `gmail_${Date.now()}`,
            },
          });
          console.log('📝 Email logged to database successfully');
        } catch (dbError) {
          console.warn('📝 Could not log email to database:', dbError);
        }

        // Using date utils for better formatting
        const scheduledDate = addDays(new Date(), delayDays);
        const scheduleMessage = formatEmailDelay(delayDays);

        // Enhanced response with readable dates:
        return NextResponse.json({
          success: true,
          messageId: response.data?.id || 'nango_sent',
          message: `REAL email sent via Nango to ${to}`,
          processedSubject,
          processedBody,
          sentFrom: `${fromName} <noreply@revgeni.ai>`,
          mode: 'nango',
          userId,
          
          // ISO format for programmatic use
          scheduledAt: scheduledDate.toISOString(),
          timestamp: new Date().toISOString(),
          
          // Human-readable formats using your utils
          scheduledAtReadable: formatDateReadable(scheduledDate),
          timestampReadable: formatDateReadable(new Date()),
          scheduleMessage: scheduleMessage,
        });

      } catch (nangoError) {
        const errorMessage = nangoError instanceof Error ? nangoError.message : 'Unknown error';
        console.warn('⚠️ Nango failed, using mock:', errorMessage);
        console.warn('Nango error details:', (nangoError as any).response?.data || nangoError);
      }
    }

    // Mock response (fallback)
    const mockResponse = {
      success: true,
      messageId: `mock_${Date.now()}`,
      message: `Mock email sent to ${to} (Nango not configured or failed)`,
      processedSubject,
      processedBody,
      sentFrom: `${fromName} <noreply@revgeni.ai>`,
      mode: 'mock',
      userId,
      scheduledAt: scheduledAt.toISOString(),
      scheduleMessage,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Mock email response:', mockResponse);
    return NextResponse.json(mockResponse);

  } catch (error) {
    console.error('❌ Email API error:', error);
    
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to send email',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Helper function for dynamic connection IDs
async function getUserConnectionId(userId: string): Promise<string | null> {
  try {
    const { prisma } = await import('@/lib/prisma');
    
    // First, try to find existing connection for this user
    const existingConnection = await prisma.userConnection.findFirst({
      where: { 
        userId: userId,
        provider: 'gmail',
        status: 'active'
      }
    });

    if (existingConnection) {
      console.log(`🔗 Found existing Gmail connection for user ${userId}`);
      return existingConnection.nangoConnectionId;
    }

    // For demo/testing - fall back to environment variable
    if (process.env.NANGO_CONNECTION_ID) {
      console.log(`🔗 Using fallback connection for user ${userId}`);
      return process.env.NANGO_CONNECTION_ID;
    }

    console.warn(`⚠️ No Gmail connection found for user ${userId}`);
    return null;

  } catch (error) {
    console.error('❌ Error getting connection ID:', error);
    // Fall back to environment variable for demo
    return process.env.NANGO_CONNECTION_ID || null;
  }
}