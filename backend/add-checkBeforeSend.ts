import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

console.log('Добавление поля checkBeforeSend в таблицу agents...');

try {
  // Check if column already exists
  const tableInfo = db.prepare("PRAGMA table_info(agents)").all() as any[];
  const columnExists = tableInfo.some((col: any) => col.name === 'checkBeforeSend');

  if (!columnExists) {
    db.exec('ALTER TABLE agents ADD COLUMN checkBeforeSend INTEGER DEFAULT 0');
    console.log('✓ Поле checkBeforeSend успешно добавлено');
  } else {
    console.log('✓ Поле checkBeforeSend уже существует');
  }
} catch (error) {
  console.error('Ошибка при добавлении поля:', error);
  process.exit(1);
}

db.close();
console.log('Готово!');
