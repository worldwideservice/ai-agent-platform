import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCrmData() {
  try {
    // Найти первого агента с crmData
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
    console.log('\n=== CRM DATA ===\n');

    let crmData;
    if (typeof agent.crmData === 'string') {
      crmData = JSON.parse(agent.crmData);
    } else {
      crmData = agent.crmData;
    }

    // Воронки
    console.log('🔹 ВОРОНКИ (Pipelines):');
    if (crmData.pipelines) {
      crmData.pipelines.forEach((pipeline: any, idx: number) => {
        console.log(`\n  ${idx + 1}. ${pipeline.name} (${pipeline.id})`);
        console.log('     Этапы:');
        pipeline.stages.forEach((stage: any, stageIdx: number) => {
          console.log(`       ${stageIdx + 1}. ${stage.name} (${stage.id}) - цвет: ${stage.color}`);
        });
      });
    }

    // Поля сделок
    console.log('\n\n🔹 ПОЛЯ СДЕЛОК (Deal Fields):');
    if (crmData.dealFields) {
      crmData.dealFields.slice(0, 10).forEach((field: any, idx: number) => {
        console.log(`  ${idx + 1}. ${field.label} (${field.id}) - тип: ${field.type}`);
      });
      if (crmData.dealFields.length > 10) {
        console.log(`  ... и ещё ${crmData.dealFields.length - 10} полей`);
      }
    }

    // Поля контактов
    console.log('\n\n🔹 ПОЛЯ КОНТАКТОВ (Contact Fields):');
    if (crmData.contactFields) {
      crmData.contactFields.slice(0, 10).forEach((field: any, idx: number) => {
        console.log(`  ${idx + 1}. ${field.label} (${field.id}) - тип: ${field.type}`);
      });
      if (crmData.contactFields.length > 10) {
        console.log(`  ... и ещё ${crmData.contactFields.length - 10} полей`);
      }
    }

    // Пользователи
    console.log('\n\n🔹 ПОЛЬЗОВАТЕЛИ (Users):');
    if (crmData.users) {
      crmData.users.forEach((user: any, idx: number) => {
        console.log(`  ${idx + 1}. ${user.name} (ID: ${user.id}) - ${user.email} [${user.role}]`);
      });
    }

    // Типы задач
    console.log('\n\n🔹 ТИПЫ ЗАДАЧ (Task Types):');
    if (crmData.taskTypes) {
      crmData.taskTypes.forEach((taskType: any, idx: number) => {
        console.log(`  ${idx + 1}. ${taskType.name} (ID: ${taskType.id})`);
      });
    }

    // Действия
    console.log('\n\n🔹 ДЕЙСТВИЯ ДЛЯ АВТОМАТИЗАЦИИ (Actions):');
    if (crmData.actions) {
      crmData.actions.forEach((action: any, idx: number) => {
        console.log(`  ${idx + 1}. ${action.name} (${action.id})`);
        console.log(`     ${action.description}`);
      });
    }

    // Каналы
    console.log('\n\n🔹 КАНАЛЫ (Channels):');
    if (crmData.channels) {
      crmData.channels.forEach((channel: any, idx: number) => {
        console.log(`  ${idx + 1}. ${channel.name} (${channel.id})`);
      });
    }

    console.log('\n\n=== СТАТИСТИКА ===');
    console.log(`Воронок: ${crmData.pipelines?.length || 0}`);
    console.log(`Полей сделок: ${crmData.dealFields?.length || 0}`);
    console.log(`Полей контактов: ${crmData.contactFields?.length || 0}`);
    console.log(`Пользователей: ${crmData.users?.length || 0}`);
    console.log(`Типов задач: ${crmData.taskTypes?.length || 0}`);
    console.log(`Действий: ${crmData.actions?.length || 0}`);
    console.log(`Каналов: ${crmData.channels?.length || 0}`);
    console.log(`\nПоследняя синхронизация: ${crmData.lastSynced || 'Неизвестно'}`);

  } catch (error) {
    console.error('Ошибка при чтении данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCrmData();
