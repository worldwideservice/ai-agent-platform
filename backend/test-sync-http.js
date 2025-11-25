const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function testSync() {
  try {
    // Get the first user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('❌ No user found');
      return;
    }

    console.log('👤 User found:', user.email);

    // Get the agent
    const agent = await prisma.agent.findFirst({
      where: { userId: user.id },
    });

    if (!agent) {
      console.error('❌ No agent found');
      return;
    }

    console.log('🤖 Agent found:', agent.name);

    // Create a JWT token for auth
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });

    console.log('🔑 Generated auth token');

    // Test the sync endpoint
    console.log('\n📊 Testing sync endpoint...');
    const response = await fetch(`http://localhost:3001/api/agents/${agent.id}/integrations/kommo/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('❌ Sync failed:', response.status, responseText);
      return;
    }

    const data = JSON.parse(responseText);
    console.log('✅ Success! Sync response:', JSON.stringify(data, null, 2));
    console.log('\n🎉 Kommo sync is working correctly!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testSync();
