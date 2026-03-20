/**
 * Seed script to create initial OAuth clients
 * Run with: npx tsx src/db/seed.ts
 */

import dotenv from 'dotenv';
import { hashPassword } from '../shared/password.utils';
import { getDatabasePool } from './database';

dotenv.config();

async function seed() {
  console.log('Starting database seed...');

  const pool = await getDatabasePool();

  try {
    // Create dashboard OAuth client
    const dashboardClientId = 'dashboard-client';
    const dashboardSecret = 'dashboard-secret-change-in-production';
    const secretHash = await hashPassword(dashboardSecret);

    // Check if client already exists
    const [existing] = await pool.query(
      'SELECT id FROM oauth_clients WHERE client_id = ?',
      [dashboardClientId]
    );

    if ((existing as any[]).length > 0) {
      console.log('Dashboard client already exists, skipping...');
    } else {
      await pool.query(
        `INSERT INTO oauth_clients 
         (client_id, client_secret_hash, name, redirect_uris, allowed_scopes, grant_types, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          dashboardClientId,
          secretHash,
          'Dashboard Application',
          JSON.stringify(['http://localhost:5173/callback']),
          JSON.stringify(['openid', 'profile', 'email', 'offline_access']),
          JSON.stringify(['authorization_code', 'refresh_token']),
          true,
        ]
      );
      console.log('✓ Created dashboard OAuth client');
      console.log(`  Client ID: ${dashboardClientId}`);
      console.log(`  Client Secret: ${dashboardSecret}`);
      console.log(`  Redirect URI: http://localhost:5173/callback`);
    }

    console.log('\nSeed completed successfully!');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
