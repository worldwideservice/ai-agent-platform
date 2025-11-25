import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function parseCrmData() {
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
      return;
    }

    console.log('✅ Найден агент:', agent.name);
    console.log('📊 ID агента:', agent.id);
    console.log('\n=== CRM DATA (правильный парсинг) ===\n');

    // Парсим дважды, так как данные закодированы дважды
    let crmData = agent.crmData;

    // Первый парсинг
    if (typeof crmData === 'string') {
      crmData = JSON.parse(crmData);
    }

    // Второй парсинг (если всё ещё строка)
    if (typeof crmData === 'string') {
      crmData = JSON.parse(crmData);
    }

    // Воронки
    console.log('🔹 ВОРОНКИ (Pipelines):');
    if (crmData.pipelines) {
      crmData.pipelines.forEach((pipeline: any, idx: number) => {
        console.log(`\n  ${idx + 1}. ${pipeline.name} (${pipeline.id})`);
        console.log('     Этапы:');
        pipeline.stages.forEach((stage: any, stageIdx: number) => {
          console.log(`       ${stageIdx + 1}. ${stage.name} (${stage.id})${stage.color ? ' - цвет: ' + stage.color : ''}`);
        });
      });
    }

    // Каналы
    console.log('\n\n🔹 КАНАЛЫ (Channels):');
    if (crmData.channels) {
      crmData.channels.forEach((channel: any, idx: number) => {
        console.log(`  ${idx + 1}. ${channel.name} (${channel.id})`);
      });
    }

    // Поля сделок
    console.log('\n\n🔹 ПОЛЯ СДЕЛОК (Deal Fields):');
    if (crmData.dealFields) {
      crmData.dealFields.forEach((field: any, idx: number) => {
        console.log(`  ${idx + 1}. ${field.label} (${field.id}) - тип: ${field.type}`);
      });
    }

    // Поля контактов
    console.log('\n\n🔹 ПОЛЯ КОНТАКТОВ (Contact Fields):');
    if (crmData.contactFields) {
      crmData.contactFields.forEach((field: any, idx: number) => {
        console.log(`  ${idx + 1}. ${field.label} (${field.id}) - тип: ${field.type}`);
      });
    }

    // Пользователи
    console.log('\n\n🔹 ПОЛЬЗОВАТЕЛИ (Users):');
    if (crmData.users) {
      crmData.users.forEach((user: any, idx: number) => {
        console.log(`  ${idx + 1}. ${user.name} (ID: ${user.id}) - ${user.email || 'без email'} [${user.role || 'user'}]`);
      });
    } else {
      console.log('  (нет данных)');
    }

    // Типы задач
    console.log('\n\n🔹 ТИПЫ ЗАДАЧ (Task Types):');
    if (crmData.taskTypes) {
      crmData.taskTypes.forEach((taskType: any, idx: number) => {
        console.log(`  ${idx + 1}. ${taskType.name} (ID: ${taskType.id})`);
      });
    } else {
      console.log('  (нет данных)');
    }

    // Действия
    console.log('\n\n🔹 ДЕЙСТВИЯ ДЛЯ АВТОМАТИЗАЦИИ (Actions):');
    if (crmData.actions) {
      crmData.actions.forEach((action: any, idx: number) => {
        console.log(`  ${idx + 1}. ${action.name} (${action.id})`);
        if (action.description) {
          console.log(`     → ${action.description}`);
        }
      });
    } else {
      console.log('  (нет данных)');
    }

    console.log('\n\n=== СТАТИСТИКА ===');
    console.log(`Воронок: ${crmData.pipelines?.length || 0}`);
    console.log(`Этапов всего: ${crmData.pipelines?.reduce((sum: number, p: any) => sum + (p.stages?.length || 0), 0) || 0}`);
    console.log(`Каналов: ${crmData.channels?.length || 0}`);
    console.log(`Полей сделок: ${crmData.dealFields?.length || 0}`);
    console.log(`Полей контактов: ${crmData.contactFields?.length || 0}`);
    console.log(`Пользователей: ${crmData.users?.length || 0}`);
    console.log(`Типов задач: ${crmData.taskTypes?.length || 0}`);
    console.log(`Действий: ${crmData.actions?.length || 0}`);

    if (crmData.syncedAt || crmData.lastSynced) {
      console.log(`\nПоследняя синхронизация: ${crmData.syncedAt || crmData.lastSynced}`);
    }
    if (crmData.status) {
      console.log(`Статус: ${crmData.status}`);
    }

  } catch (error) {
    console.error('Ошибка при чтении данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

parseCrmData();
