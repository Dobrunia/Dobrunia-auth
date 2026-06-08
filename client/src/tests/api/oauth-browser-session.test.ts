import { afterEach, describe, expect, it, vi } from 'vitest';
import { submitOAuthBrowserSession } from '@/api/oauth-browser-session';
import { clientConfig } from '@/config';

describe('submitOAuthBrowserSession', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('отправляет first-party POST-форму с токеном и безопасным returnUrl', () => {
    const submit = vi
      .spyOn(HTMLFormElement.prototype, 'submit')
      .mockImplementation(() => {});
    const returnUrl =
      `${clientConfig.apiUrl}/oauth/authorize` +
      '?response_type=code&client_id=target-client' +
      '&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fcallback';

    submitOAuthBrowserSession('access-token', 'target-client', returnUrl);

    const form = document.body.querySelector('form');
    expect(form?.method).toBe('post');
    expect(form?.action).toBe(`${clientConfig.apiUrl}/oauth/browser-session`);
    expect(
      Object.fromEntries(new FormData(form!).entries())
    ).toEqual({
      accessToken: 'access-token',
      clientId: 'target-client',
      returnUrl,
    });
    expect(submit).toHaveBeenCalledOnce();
  });
});
