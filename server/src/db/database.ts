import mysql from 'mysql2/promise';
import { config } from '../config';

let pool: mysql.Pool | null = null;

export async function getDatabasePool(): Promise<mysql.Pool> {
  if (!pool) {
    pool = mysql.createPool({
      uri: config.database.url,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

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
