import mysql from 'mysql2/promise';
import { config } from '../config';

let pool: mysql.Pool | null = null;

function poolConfig(): mysql.PoolOptions {
  const base: mysql.PoolOptions = {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
  if (config.database.socketPath) {
    return {
      ...base,
      socketPath: config.database.socketPath,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name,
    };
  }
  return { ...base, uri: config.database.url };
}

export async function getDatabasePool(): Promise<mysql.Pool> {
  if (!pool) {
    pool = mysql.createPool(poolConfig());

    // Test connection
    try {
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      console.log('Database connection established');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  return pool;
}

export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Dedicated connection for migrations: allows multiple statements per file (semicolon-separated). */
export async function createMigrationRunnerConnection(): Promise<mysql.Connection> {
  const base = { multipleStatements: true as const };
  if (config.database.socketPath) {
    return mysql.createConnection({
      ...base,
      socketPath: config.database.socketPath,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name,
    });
  }
  return mysql.createConnection({
    ...base,
    uri: config.database.url,
  });
}
