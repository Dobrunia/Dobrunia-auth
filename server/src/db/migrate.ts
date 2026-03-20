import mysql from 'mysql2/promise';
import { getDatabasePool } from './database';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Simple migration runner for MySQL
 * Migrations are SQL files stored in src/db/migrations
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

  // Run pending migrations
  for (const file of files) {
    if (executedMigrations.has(file)) {
      continue;
    }

    const migrationPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log(`Running migration: ${file}`);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(sql);
      await connection.query('INSERT INTO _migrations (name) VALUES (?)', [file]);
      await connection.commit();
      console.log(`Migration completed: ${file}`);
    } catch (error) {
      await connection.rollback();
      console.error(`Migration failed: ${file}`, error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  console.log('All migrations completed');
}

runMigrations().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
