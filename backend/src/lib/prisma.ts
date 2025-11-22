import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

try {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  console.log('✅ Prisma Client initialized successfully');
} catch (error) {
  console.warn('⚠️ Prisma Client initialization failed, using mock client');
  // Создаем mock клиент для минимальной функциональности
  prisma = {
    user: {},
    agent: {},
    kbCategory: {},
    kbArticle: {},
    articleCategory: {},
    userSettings: {},
    chatLog: {},
    $disconnect: async () => {},
    $connect: async () => {},
  } as unknown as PrismaClient;
}

export default prisma;
