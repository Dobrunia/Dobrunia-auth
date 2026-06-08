import { describe, expect, it } from 'vitest';
import {
  clearOAuthBridgeAttempt,
  hasOAuthBridgeAttempt,
  isAllowedOAuthReturnUrl,
  markOAuthBridgeAttempt,
  oauthClientKeyFromReturnUrl,
} from '@/lib/oauth-return-url';
import { clientConfig } from '@/config';

const validReturnUrl =
  `${clientConfig.apiUrl}/oauth/authorize` +
  '?response_type=code' +
  '&client_id=test-client' +
  '&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fcallback' +
  '&state=test-state';

describe('OAuth return URL validation', () => {
  it('принимает полный authorize URL и извлекает client_id', () => {
    expect(isAllowedOAuthReturnUrl(validReturnUrl)).toBe(true);
    expect(oauthClientKeyFromReturnUrl(validReturnUrl)).toBe('test-client');
  });

  it('отклоняет URL со склеенными параметрами', () => {
    const malformed =
      `${clientConfig.apiUrl}/oauth/authorize` +
      '?response_type=codeclient_id=test-client' +
      'redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fcallback' +
      'state=test-state';

    expect(isAllowedOAuthReturnUrl(malformed)).toBe(false);
  });

  it('отклоняет другой origin и отсутствующий redirect_uri', () => {
    expect(
      isAllowedOAuthReturnUrl(
        'https://attacker.example/oauth/authorize' +
          '?response_type=code&client_id=test&redirect_uri=https%3A%2F%2Fapp.example%2Fcallback'
      )
    ).toBe(false);
    expect(
      isAllowedOAuthReturnUrl(
        `${clientConfig.apiUrl}/oauth/authorize?response_type=code&client_id=test`
      )
    ).toBe(false);
  });

  it('добавляет и удаляет служебную отметку попытки bridge без потери OAuth query', () => {
    const marked = markOAuthBridgeAttempt(validReturnUrl);

    expect(hasOAuthBridgeAttempt(marked)).toBe(true);
    expect(isAllowedOAuthReturnUrl(marked)).toBe(true);
    expect(new URL(marked).searchParams.get('state')).toBe('test-state');
    expect(clearOAuthBridgeAttempt(marked)).toBe(validReturnUrl);
  });
});
