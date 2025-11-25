import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function cleanKBData() {
  try {
    console.log('🧹 Starting Knowledge Base data cleanup...');

    // Получаем статистику перед удалением
    const articlesCount = await prisma.kbArticle.count();
    const categoriesCount = await prisma.kbCategory.count();

    console.log(`📊 Found ${articlesCount} articles and ${categoriesCount} categories`);

    // Удаляем все статьи (связи удалятся автоматически благодаря onDelete: Cascade)
    const deletedArticles = await prisma.kbArticle.deleteMany({});
    console.log(`✅ Deleted ${deletedArticles.count} articles`);

    // Удаляем все категории
    const deletedCategories = await prisma.kbCategory.deleteMany({});
    console.log(`✅ Deleted ${deletedCategories.count} categories`);

    console.log('\n✅ Knowledge Base cleanup completed!');
    console.log('ℹ️  Users will start with a clean slate - no default categories.');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanKBData();
