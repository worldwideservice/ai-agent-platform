const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSync() {
  try {
    // Get the first user's token
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('❌ No user found');
      return;
    }

    console.log('👤 User found:', user.email);

    // Generate a JWT token (simplified - you may need to use proper JWT library)
    // For now, let's get the agent and integration directly
    const agent = await prisma.agent.findFirst({
      where: { userId: user.id },
    });

    if (!agent) {
      console.error('❌ No agent found');
      return;
    }

    console.log('🤖 Agent found:', agent.name);

    const integration = await prisma.integration.findFirst({
      where: {
        agentId: agent.id,
        integrationType: 'kommo',
      },
    });

    if (!integration) {
      console.error('❌ No Kommo integration found');
      return;
    }

    console.log('🔌 Integration found:', integration.id);

    // Now test the Kommo service directly
    console.log('\n📊 Making direct API call to test sync endpoint...');

    // Make a direct test of the getValidAccessToken function
    const kommoService = require('./dist/services/kommo.service.js');

    console.log('🔍 Getting valid access token...');
    const { token, baseDomain, apiDomain } = await kommoService.getValidAccessToken(integration.id);

    console.log('✅ Token retrieved:', { baseDomain, apiDomain });

    // Test API call
    console.log('📊 Fetching pipelines from Kommo...');
    const response = await fetch(`https://${apiDomain}/api/v4/leads/pipelines`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Kommo API error: ${response.status} ${error}`);
    }

    const pipelinesData = await response.json();

    console.log('✅ Success! Fetched pipelines:', {
      count: pipelinesData._embedded.pipelines.length,
      pipelines: pipelinesData._embedded.pipelines.map((p) => ({
        id: p.id,
        name: p.name,
        stages: p._embedded.statuses.length,
      })),
    });

    console.log('\n🎉 Kommo sync is working correctly!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testSync();
