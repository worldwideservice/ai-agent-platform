import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new Database(dbPath);

console.log('🔧 Adding CRM tables to database...');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Read SQL file
const sqlPath = path.join(__dirname, 'add-crm-tables.sql');
const sql = fs.readFileSync(sqlPath, 'utf-8');

try {
  // Execute SQL
  db.exec(sql);

  console.log('✅ CRM tables added successfully!');
  console.log('📊 Tables:');

  // List all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  tables.forEach((table: any) => {
    console.log('  -', table.name);
  });

} catch (error) {
  console.error('❌ Error adding CRM tables:', error);
  process.exit(1);
} finally {
  db.close();
}
