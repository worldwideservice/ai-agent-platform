import { prisma } from '../src/config/database';

async function main() {
  // Рабочая интеграция (WWS)
  const workingToken = await prisma.kommoToken.findFirst({
    where: { integrationId: '0ae81a45-b568-44ee-8480-7e72bd1abc1c' }
  });

  // Неработающая интеграция (новый агент)
  const brokenToken = await prisma.kommoToken.findFirst({
    where: { integrationId: '319682c1-aa26-4db0-8ab0-0f3fb5042770' }
  });

  console.log('=== РАБОЧАЯ ИНТЕГРАЦИЯ (WWS) ===');
  if (workingToken) {
    console.log('IntegrationId:', workingToken.integrationId);
    console.log('BaseDomain:', workingToken.baseDomain);
    console.log('ApiDomain:', workingToken.apiDomain);
    console.log('ExpiresAt:', workingToken.expiresAt);
  } else {
    console.log('Токен не найден');
  }

  console.log('\n=== НЕРАБОТАЮЩАЯ ИНТЕГРАЦИЯ (новый агент) ===');
  if (brokenToken) {
    console.log('IntegrationId:', brokenToken.integrationId);
    console.log('BaseDomain:', brokenToken.baseDomain);
    console.log('ApiDomain:', brokenToken.apiDomain);
    console.log('ExpiresAt:', brokenToken.expiresAt);
  } else {
    console.log('Токен не найден');
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
