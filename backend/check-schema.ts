import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

console.log('Проверка структуры таблицы agents...\n');

try {
  const tableInfo = db.prepare("PRAGMA table_info(agents)").all() as any[];

  console.log('Столбцы таблицы agents:');
  tableInfo.forEach((col: any) => {
    console.log(`  - ${col.name} (${col.type})${col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ''}`);
  });

  const hasCheckBeforeSend = tableInfo.some((col: any) => col.name === 'checkBeforeSend');
  console.log(`\ncheckBeforeSend существует: ${hasCheckBeforeSend ? 'ДА' : 'НЕТ'}`);

} catch (error) {
  console.error('Ошибка:', error);
}

db.close();
