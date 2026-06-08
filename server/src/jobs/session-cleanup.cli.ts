import { closeDatabasePool } from '../db/database';
import { sessionsService } from '../modules/sessions/sessions.service';
import { Log } from '../utils/log';

async function main(): Promise<void> {
  try {
    const deleted = await sessionsService.cleanupFinished();
    Log.success('Session cleanup completed', { deleted });
  } catch (error) {
    Log.error('Session cleanup command failed', error);
    process.exitCode = 1;
  } finally {
    await closeDatabasePool();
  }
}

void main();
