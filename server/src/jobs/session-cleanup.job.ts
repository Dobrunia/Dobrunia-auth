import { config } from '../config';
import { sessionsService } from '../modules/sessions/sessions.service';
import { Log } from '../utils/log';

const MINUTE_MS = 60_000;

export function startSessionCleanupJob(): () => void {
  if (!config.sessionCleanup.enabled) {
    Log.info('Session cleanup job disabled');
    return () => undefined;
  }

  let running = false;

  const run = async (): Promise<void> => {
    if (running) {
      Log.warn('Session cleanup skipped because previous run is still active');
      return;
    }

    running = true;
    try {
      await sessionsService.cleanupFinished();
    } catch (error) {
      Log.error('Session cleanup failed', error);
    } finally {
      running = false;
    }
  };

  void run();

  const timer = setInterval(
    () => void run(),
    config.sessionCleanup.intervalMinutes * MINUTE_MS
  );
  timer.unref();

  Log.info('Session cleanup job scheduled', {
    intervalMinutes: config.sessionCleanup.intervalMinutes,
  });

  return () => clearInterval(timer);
}
