import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkIntegration() {
  try {
    // Найти агента WWS
    const agent = await prisma.agent.findFirst({
      where: {
        name: 'WWS',
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!agent) {
      console.log('❌ Агент WWS не найден');
      return;
    }

    console.log('✅ Найден агент:', agent.name);
    console.log('📊 ID агента:', agent.id);

    // Найти все интеграции этого агента
    const integrations = await prisma.integration.findMany({
      where: {
        agentId: agent.id,
      },
      select: {
        id: true,
        integrationType: true,
        isActive: true,
        isConnected: true,
        connectedAt: true,
        lastSynced: true,
        createdAt: true,
      },
    });

    console.log('\n=== ИНТЕГРАЦИИ ===\n');

    if (integrations.length === 0) {
      console.log('❌ Интеграций не найдено');
    } else {
      integrations.forEach((integration, idx) => {
        console.log(`${idx + 1}. ${integration.integrationType.toUpperCase()}`);
        console.log(`   ID: ${integration.id}`);
        console.log(`   Активна: ${integration.isActive ? '✅ Да' : '❌ Нет'}`);
        console.log(`   Подключена: ${integration.isConnected ? '✅ Да' : '❌ Нет'}`);
        console.log(`   Дата подключения: ${integration.connectedAt || 'не подключена'}`);
        console.log(`   Последняя синхронизация: ${integration.lastSynced || 'не синхронизировалась'}`);
        console.log(`   Создана: ${integration.createdAt}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkIntegration();
