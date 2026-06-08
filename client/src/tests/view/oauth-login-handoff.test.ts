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
}));

vi.mock('@/components/AuthCredentialsForm.vue', () => ({
  default: {
    emits: ['submit', 'update:email', 'update:password'],
    template: '<button class="submit" @click="$emit(\'submit\')">Submit</button>',
  },
}));

vi.mock('@/api/auth-api', () => ({
  login: vi.fn(),
  register: vi.fn(),
}));

vi.mock('@/api/oauth-browser-session', () => ({
  submitOAuthBrowserSession: vi.fn(),
}));

import { login, register } from '@/api/auth-api';
import { submitOAuthBrowserSession } from '@/api/oauth-browser-session';
import { clientConfig } from '@/config';
import { hasOAuthBridgeAttempt } from '@/lib/oauth-return-url';
import { tokenStorage } from '@/lib/token-storage';
import LoginPage from '@/view/LoginPage.vue';
import RegisterPage from '@/view/RegisterPage.vue';

const returnUrl =
  `${clientConfig.apiUrl}/oauth/authorize` +
  '?response_type=code' +
  '&client_id=target-client' +
  '&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fcallback' +
  '&state=test-state';

const authResult = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  user: {
    id: 'user-1',
    email: 'user@example.com',
  },
  session: {
    id: 'session-1',
    clientId: 'client-1',
    clientSlug: 'target-client',
  },
};

describe('OAuth login handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenStorage.clear();
    testState.route.query = {
      oauth: '1',
      client: 'target-client',
      return_url: returnUrl,
    };
    vi.mocked(login).mockResolvedValue(authResult);
    vi.mocked(register).mockResolvedValue(authResult);
  });

  afterEach(() => {
    tokenStorage.clear();
  });

  it.each([
    ['login', LoginPage, login],
    ['register', RegisterPage, register],
  ])('после %s отправляет помеченный first-party handoff', async (_, page, authCall) => {
    const wrapper = mount(page, {
      global: {
        stubs: {
          RouterLink: true,
        },
      },
    });

    await wrapper.get('.submit').trigger('click');
    await flushPromises();

    expect(authCall).toHaveBeenCalledOnce();
    expect(submitOAuthBrowserSession).toHaveBeenCalledOnce();
    const [accessToken, clientId, markedReturnUrl] =
      vi.mocked(submitOAuthBrowserSession).mock.calls[0];
    expect(accessToken).toBe('access-token');
    expect(clientId).toBe('target-client');
    expect(hasOAuthBridgeAttempt(markedReturnUrl)).toBe(true);
    expect(new URL(markedReturnUrl).searchParams.get('state')).toBe('test-state');
    expect(testState.replace).not.toHaveBeenCalled();
  });
});
