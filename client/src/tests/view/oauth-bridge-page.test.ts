import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  route: {
    query: {} as Record<string, string>,
  },
  replace: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => testState.route,
  useRouter: () => ({
    replace: testState.replace,
  }),
}));

vi.mock('dobruniaui-vue', () => ({
  DbrButton: {
    template: '<button><slot /></button>',
  },
  DbrLoader: {
    template: '<span class="loader-stub"></span>',
  },
}));

vi.mock('@/api/auth-api', () => ({
  fetchMe: vi.fn(),
}));

vi.mock('@/api/oauth-browser-session', () => ({
  submitOAuthBrowserSession: vi.fn(),
}));

import { fetchMe } from '@/api/auth-api';
import { RequestTimeoutError } from '@/api/fetch-with-timeout';
import { ApiError } from '@/api/http';
import { submitOAuthBrowserSession } from '@/api/oauth-browser-session';
import { clientConfig } from '@/config';
import { markOAuthBridgeAttempt } from '@/lib/oauth-return-url';
import { tokenStorage } from '@/lib/token-storage';
import OAuthBridgePage from '@/view/OAuthBridgePage.vue';

const returnUrl =
  `${clientConfig.apiUrl}/oauth/authorize` +
  '?response_type=code' +
  '&client_id=target-client' +
  '&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fcallback' +
  '&state=test-state';

describe('OAuthBridgePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.replace.mockResolvedValue(undefined);
    tokenStorage.clear();
    testState.route.query = { return_url: returnUrl };
  });

  afterEach(() => {
    tokenStorage.clear();
    vi.unstubAllGlobals();
  });

  it('создаёт сессию целевого клиента из уже существующего входа другого клиента', async () => {
    tokenStorage.setTokens('existing-access', 'existing-refresh');
    vi.mocked(fetchMe).mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        username: null,
        firstName: null,
        lastName: null,
        avatarUrl: null,
      },
      session: {
        id: 'source-session',
        clientId: 'auth-web-client',
        clientSlug: 'dobrunia-auth-web',
        clientName: 'Dobrunia Auth Web',
      },
    });
    mount(OAuthBridgePage);
    await flushPromises();

    expect(fetchMe).toHaveBeenCalledWith({ redirectOnUnauthorized: false });
    expect(submitOAuthBrowserSession).toHaveBeenCalledWith(
      'existing-access',
      'target-client',
      markOAuthBridgeAttempt(returnUrl)
    );
    expect(testState.replace).not.toHaveBeenCalled();
  });

  it('останавливает повторный bridge после неустановленной cookie', async () => {
    testState.route.query = { return_url: markOAuthBridgeAttempt(returnUrl) };

    const wrapper = mount(OAuthBridgePage);
    await flushPromises();

    expect(wrapper.text()).toContain('Браузер не подтвердил OAuth-сессию');
    expect(fetchMe).not.toHaveBeenCalled();
    expect(submitOAuthBrowserSession).not.toHaveBeenCalled();
  });

  it('разрывает цикл router через явный reauth при недействительном токене', async () => {
    tokenStorage.setTokens('expired-access', 'expired-refresh');
    vi.mocked(fetchMe).mockRejectedValue(new ApiError('Unauthorized', 401));

    mount(OAuthBridgePage);
    await flushPromises();

    expect(testState.replace).toHaveBeenCalledWith({
      path: '/login',
      query: {
        oauth: '1',
        reauth: '1',
        return_url: returnUrl,
        client: 'target-client',
      },
    });
  });

  it('показывает ошибку вместо вечного loader при таймауте API', async () => {
    tokenStorage.setTokens('existing-access', 'existing-refresh');
    vi.mocked(fetchMe).mockRejectedValue(new RequestTimeoutError());

    const wrapper = mount(OAuthBridgePage);
    await flushPromises();

    expect(wrapper.text()).toContain('не ответил вовремя');
    expect(wrapper.find('.loader-stub').exists()).toBe(false);
    expect(testState.replace).not.toHaveBeenCalled();
  });
});
