const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

const prisma = new PrismaClient();

async function testKommo() {
  // Получаем integration
  const integrations = await prisma.integration.findMany({
    where: { integrationType: 'kommo' }
  });
  
  console.log('Found integrations:', integrations.length);
  
  if (integrations.length === 0) {
    console.log('No Kommo integrations found');
    return;
  }
  
  const integration = integrations[0];
  console.log('Integration ID:', integration.id);
  console.log('Agent ID:', integration.agentId);
  console.log('Is Connected:', integration.isConnected);
  
  // Получаем токен
  const token = await prisma.kommoToken.findUnique({
    where: { integrationId: integration.id }
  });
  
  if (!token) {
    console.log('❌ NO TOKEN FOUND FOR INTEGRATION');
    return;
  }
  
  console.log('✅ Token found:');
  console.log('  Base Domain:', token.baseDomain);
  console.log('  API Domain:', token.apiDomain);
  console.log('  Expires At:', token.expiresAt);
  console.log('  Token (first 20 chars):', token.accessToken.substring(0, 20) + '...');
  
  // Тестируем запрос к API
  console.log('\n🔄 Testing API request...');
  const apiDomain = token.apiDomain || 'api-g.kommo.com';
  const url = `https://${apiDomain}/api/v4/leads/pipelines`;
  
  console.log('URL:', url);
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('Response status:', response.status);
  
  if (response.ok) {
    const data = await response.json();
    console.log('✅ SUCCESS! Pipelines:', data._embedded?.pipelines?.length || 0);
  } else {
    const error = await response.text();
    console.log('❌ ERROR:', error);
  }
  
  await prisma.$disconnect();
}

testKommo().catch(console.error);
