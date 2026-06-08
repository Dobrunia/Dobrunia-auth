const DEFAULT_TIMEOUT_MS = 15_000;

export class RequestTimeoutError extends Error {
  constructor() {
    super('Сервер не ответил вовремя');
    this.name = 'RequestTimeoutError';
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const externalSignal = init.signal;
  const abortFromExternal = () => controller.abort(externalSignal?.reason);

  if (externalSignal?.aborted) {
    abortFromExternal();
  } else {
    externalSignal?.addEventListener('abort', abortFromExternal, { once: true });
  }

  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted && !externalSignal?.aborted) {
      throw new RequestTimeoutError();
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timer);
    externalSignal?.removeEventListener('abort', abortFromExternal);
  }
}
