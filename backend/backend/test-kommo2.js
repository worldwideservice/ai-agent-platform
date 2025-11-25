const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

const prisma = new PrismaClient();

async function testKommo() {
  const integrations = await prisma.integration.findMany({
    where: { integrationType: 'kommo' }
  });
  
  const integration = integrations[0];
  const token = await prisma.kommoToken.findUnique({
    where: { integrationId: integration.id }
  });
  
  console.log('Testing with different domains...\n');
  
  // Test 1: api-g.kommo.com
  console.log('1. Testing api-g.kommo.com');
  let url = `https://api-g.kommo.com/api/v4/leads/pipelines`;
  let response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  console.log('   Status:', response.status);
  
  // Test 2: baseDomain
  console.log('\n2. Testing', token.baseDomain);
  url = `https://${token.baseDomain}/api/v4/leads/pipelines`;
  response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  console.log('   Status:', response.status);
  if (response.ok) {
    const data = await response.json();
    console.log('   ✅ SUCCESS! Pipelines:', data._embedded?.pipelines?.length || 0);
  } else {
    const error = await response.text();
    console.log('   Error:', error.substring(0, 200));
  }
  
  // Test 3: worldwideservices.kommo.com
  console.log('\n3. Testing worldwideservices.kommo.com');
  url = `https://worldwideservices.kommo.com/api/v4/leads/pipelines`;
  response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  console.log('   Status:', response.status);
  if (response.ok) {
    const data = await response.json();
    console.log('   ✅ SUCCESS! Pipelines:', data._embedded?.pipelines?.length || 0);
  } else {
    const error = await response.text();
    console.log('   Error:', error.substring(0, 200));
  }
  
  await prisma.$disconnect();
}

testKommo().catch(console.error);
