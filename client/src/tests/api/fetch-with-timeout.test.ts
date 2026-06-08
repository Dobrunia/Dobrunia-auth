import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWithTimeout, RequestTimeoutError } from '@/api/fetch-with-timeout';

describe('fetchWithTimeout', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('прерывает зависший запрос по таймауту', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      })
    );

    const request = fetchWithTimeout('/slow', {}, 1000);
    const assertion = expect(request).rejects.toBeInstanceOf(RequestTimeoutError);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it('возвращает обычный ответ до истечения таймаута', async () => {
    const response = new Response(null, { status: 204 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    await expect(fetchWithTimeout('/fast', {}, 1000)).resolves.toBe(response);
  });
});
