import { createMigrationRunnerConnection, getDatabasePool } from './database';
import * as path from 'path';
import * as fs from 'fs';

/**
 * MySQL migrations: каждый `*.sql` из `src/db/migrations` выполняется ровно один раз
 * (имя файла пишется в `_migrations`). Перезапуск сервера не переигрывает уже применённые файлы
 * и не трогает данные. Новые файлы добавляйте с большим префиксом сортировки (003_…).
 */

export async function runMigrations(): Promise<void> {
  console.log('Starting migrations...');
  
  const pool = await getDatabasePool();
  console.log('Database pool obtained');

  // Create migrations table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get already executed migrations
  const [rows] = await pool.query(
    'SELECT name FROM _migrations ORDER BY id'
  );
  const executedMigrations = new Set((rows as { name: string }[]).map((r) => r.name));

  // Get migration files - use process.cwd() for tsx development
  const migrationsDir = path.join(process.cwd(), 'src', 'db', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found at:', migrationsDir);
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const migrationConn = await createMigrationRunnerConnection();
  try {
    // Run pending migrations (multipleStatements so one .sql file can contain ALTER; CREATE; etc.)
    for (const file of files) {
      if (executedMigrations.has(file)) {
        continue;
      }

      const migrationPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(migrationPath, 'utf-8');

      console.log(`Running migration: ${file}`);

      try {
        await migrationConn.beginTransaction();
        await migrationConn.query(sql);
        await migrationConn.query('INSERT INTO _migrations (name) VALUES (?)', [file]);
        await migrationConn.commit();
        executedMigrations.add(file);
        console.log(`Migration completed: ${file}`);
      } catch (error) {
        await migrationConn.rollback();
        console.error(`Migration failed: ${file}`, error);
        throw error;
      }
    }
  } finally {
    await migrationConn.end();
  }
  
  console.log('All migrations completed');
}
