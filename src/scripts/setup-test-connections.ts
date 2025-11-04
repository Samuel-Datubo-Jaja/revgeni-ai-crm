import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function setupTestConnections() {
  console.log('🔗 Setting up test connections...');
  
  const nangoConnectionId = process.env.NANGO_CONNECTION_ID;
  if (!nangoConnectionId) {
    console.error('❌ NANGO_CONNECTION_ID not found in environment variables');
    process.exit(1);
  }
  
  console.log('✅ Environment loaded, connection ID found:', nangoConnectionId.substring(0, 8) + '...');

  // Step 1: Create demo organization
  const demoOrg = await prisma.org.upsert({
    where: { id: 'demo-org' },
    update: { name: 'Demo Organization' },
    create: {
      id: 'demo-org',
      name: 'Demo Organization',
    }
  });

  console.log('✅ Demo organization created:', demoOrg.name);

  // Step 2: Create demo user
  const demoUser = await prisma.user.upsert({
    where: { id: 'demo-user' },
    update: { email: 'samuel.jaja21@gmail.com' },
    create: {
      id: 'demo-user',
      email: 'samuel.jaja21@gmail.com',
    }
  });

  console.log('✅ Demo user created:', demoUser.email);

  // Step 3: Create UserOrg relationship (WITH required role)
  await prisma.userOrg.upsert({
    where: {
      userId_orgId: { userId: 'demo-user', orgId: 'demo-org' }
    },
    update: { role: 'admin' }, // ← Update role too
    create: {
      userId: 'demo-user',
      orgId: 'demo-org',
      role: 'admin', // ← Add required role field
    }
  });

  console.log('✅ User-Org relationship created');

  // Step 4: Create the Gmail connection
  const mainConnection = await prisma.userConnection.create({
    data: {
      userId: 'demo-user',
      orgId: 'demo-org',
      provider: 'gmail',
      nangoConnectionId: nangoConnectionId,
      email: 'samuel.jaja21@gmail.com',
      status: 'active',
      scopes: ['https://www.googleapis.com/auth/gmail.send'],
    }
  });

  console.log('✅ Gmail connection created successfully!');
  console.log(`📧 Connection: ${mainConnection.email}`);
  console.log(`🔗 Connection ID: ${mainConnection.nangoConnectionId.substring(0, 8)}...`);
  console.log('🎯 Dynamic user connections are now set up!');
}

setupTestConnections()
  .catch(console.error)
  .finally(() => prisma.$disconnect());