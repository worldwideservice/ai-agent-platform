#!/bin/bash

# Получаем токен из localStorage (предполагается что пользователь авторизован)
echo "Testing GET /agents/:agentId/integrations endpoint"
echo ""
echo "Expected: isConnected = false"
echo "Let's check what API actually returns..."
echo ""

# Прямой запрос к базе данных
cd "/Users/maksimgolovaty/Library/Mobile Documents/com~apple~CloudDocs/Development/ai-agent-platform/backend"
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  const agentId = '65cf13b4-b5e3-4056-9c89-24959b996416';

  // Симулируем API endpoint
  const integrations = await prisma.integration.findMany({
    where: { agentId },
    orderBy: { createdAt: 'asc' },
  });

  const integrationsWithParsedSettings = integrations.map((integration) => ({
    ...integration,
    settings: integration.settings ? JSON.parse(integration.settings) : null,
  }));

  const kommo = integrationsWithParsedSettings.find((i) => i.integrationType === 'kommo');

  console.log('=== API RESPONSE (what frontend receives) ===');
  console.log(JSON.stringify(kommo, null, 2));
  console.log('');
  console.log('isConnected:', kommo?.isConnected);
  console.log('isActive:', kommo?.isActive);

  await prisma.\$disconnect();
})();
"
