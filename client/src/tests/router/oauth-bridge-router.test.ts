import { afterEach, describe, expect, it } from 'vitest';
import { clientConfig } from '@/config';
import { tokenStorage } from '@/lib/token-storage';
import router from '@/router';

describe('OAuth bridge bootstrap route', () => {
  afterEach(async () => {
    tokenStorage.clear();
    await router.replace('/login');
  });

  it('переводит корневой bootstrap URL на клиентский /oauth-bridge', async () => {
    const returnUrl =
      `${clientConfig.apiUrl}/oauth/authorize` +
      '?response_type=code' +
      '&client_id=test-client' +
      '&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fcallback' +
      '&state=test-state';

    await router.push({
      path: '/',
      query: {
        oauth_bridge: '1',
        return_url: returnUrl,
      },
    });

    expect(router.currentRoute.value.path).toBe('/oauth-bridge');
    expect(router.currentRoute.value.query.return_url).toBe(returnUrl);
  });

  it('не возвращает с login обратно на bridge при явном reauth', async () => {
    tokenStorage.setTokens('access-token', 'refresh-token');

    await router.push({
      path: '/login',
      query: {
        oauth: '1',
        reauth: '1',
        return_url: 'http://localhost:3000/oauth/authorize?response_type=code',
      },
    });

    expect(router.currentRoute.value.path).toBe('/login');
    expect(router.currentRoute.value.query.reauth).toBe('1');
  });
});
