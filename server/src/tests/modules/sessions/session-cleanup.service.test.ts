import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/database', () => ({
  getDatabasePool: vi.fn(),
}));

import { getDatabasePool } from '../../../db/database';
import { sessionsService } from '../../../modules/sessions/sessions.service';

describe('sessionsService.cleanupFinished', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('удаляет revoked и expired сессии и возвращает их количество', async () => {
    const connection = {
      execute: vi.fn().mockResolvedValue([{ affectedRows: 3 }, []]),
      release: vi.fn(),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as never);

    const deleted = await sessionsService.cleanupFinished();

    expect(deleted).toBe(3);
    expect(connection.execute).toHaveBeenCalledWith(
      'DELETE FROM sessions WHERE status IN (?, ?)',
      ['revoked', 'expired']
    );
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it('освобождает соединение при ошибке удаления', async () => {
    const connection = {
      execute: vi.fn().mockRejectedValue(new Error('database unavailable')),
      release: vi.fn(),
    };
    vi.mocked(getDatabasePool).mockResolvedValue({
      getConnection: vi.fn().mockResolvedValue(connection),
    } as never);

    await expect(sessionsService.cleanupFinished()).rejects.toThrow('database unavailable');
    expect(connection.release).toHaveBeenCalledOnce();
  });
});
