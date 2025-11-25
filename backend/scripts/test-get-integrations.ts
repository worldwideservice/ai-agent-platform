import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testGetIntegrations() {
  try {
    const agentId = '65cf13b4-b5e3-4056-9c89-24959b996416';

    // Симулируем то, что делает API endpoint GET /agents/:agentId/integrations
    const integrations = await prisma.integration.findMany({
      where: { agentId },
      orderBy: { createdAt: 'asc' },
    });

    console.log('=== RAW DATABASE RESULT ===');
    console.log(JSON.stringify(integrations, null, 2));

    // Парсим JSON настройки (как в API)
    const integrationsWithParsedSettings = integrations.map((integration: any) => ({
      ...integration,
      settings: integration.settings ? JSON.parse(integration.settings) : null,
    }));

    console.log('\n=== AFTER JSON PARSE (what API returns) ===');
    console.log(JSON.stringify(integrationsWithParsedSettings, null, 2));

    // Проверяем Kommo интеграцию
    const kommo = integrationsWithParsedSettings.find((i: any) => i.integrationType === 'kommo');

    console.log('\n=== KOMMO INTEGRATION ===');
    if (kommo) {
      console.log('ID:', kommo.id);
      console.log('isActive:', kommo.isActive);
      console.log('isConnected:', kommo.isConnected);
      console.log('connectedAt:', kommo.connectedAt);
      console.log('lastSynced:', kommo.lastSynced);
    } else {
      console.log('❌ Kommo integration not found!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testGetIntegrations();
