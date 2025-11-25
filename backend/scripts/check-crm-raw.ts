import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRawCrmData() {
  try {
    const agent = await prisma.agent.findFirst({
      where: {
        crmData: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        crmData: true,
      },
    });

    if (!agent) {
      console.log('❌ Агент с CRM данными не найден');

      // Проверим все агенты
      const allAgents = await prisma.agent.findMany({
        select: {
          id: true,
          name: true,
          crmData: true,
        },
      });

      console.log('\n📋 Все агенты в базе:');
      allAgents.forEach((a, idx) => {
        console.log(`  ${idx + 1}. ${a.name} (${a.id})`);
        console.log(`     crmData: ${a.crmData ? 'Есть' : 'Нет'}`);
        if (a.crmData) {
          console.log(`     Тип: ${typeof a.crmData}`);
          console.log(`     Длина: ${a.crmData.toString().length} символов`);
        }
      });

      return;
    }

    console.log('✅ Найден агент:', agent.name);
    console.log('📊 ID агента:', agent.id);
    console.log('\n=== RAW CRM DATA ===\n');
    console.log('Тип данных:', typeof agent.crmData);
    console.log('\nСодержимое:');
    console.log(JSON.stringify(agent.crmData, null, 2));

  } catch (error) {
    console.error('Ошибка при чтении данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRawCrmData();
