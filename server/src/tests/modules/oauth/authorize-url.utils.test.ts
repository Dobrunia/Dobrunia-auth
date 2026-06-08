import { describe, expect, it } from 'vitest';
import { buildAuthWebBridgeUrl } from '../../../modules/oauth/authorize/authorize-url.utils';

describe('buildAuthWebBridgeUrl', () => {
  it('использует корень SPA и сохраняет все параметры вложенного authorize URL', () => {
    const returnUrl =
      'https://dobrunia-auth.na4u.ru/oauth/authorize' +
      '?response_type=code' +
      '&client_id=79fa44b5-5738-4aaa-9282-284f99ab2f90' +
      '&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fcallback' +
      '&state=e958e952-ce68-486b-b7ac-d4481bf72151';

    const result = new URL(
      buildAuthWebBridgeUrl('https://auth.dobrunia.guru', returnUrl)
    );

    expect(result.origin).toBe('https://auth.dobrunia.guru');
    expect(result.pathname).toBe('/');
    expect(result.searchParams.get('oauth_bridge')).toBe('1');
    expect(result.searchParams.get('return_url')).toBe(returnUrl);

    const nested = new URL(result.searchParams.get('return_url')!);
    expect(nested.searchParams.get('response_type')).toBe('code');
    expect(nested.searchParams.get('client_id')).toBe(
      '79fa44b5-5738-4aaa-9282-284f99ab2f90'
    );
    expect(nested.searchParams.get('redirect_uri')).toBe(
      'http://localhost:5173/auth/callback'
    );
    expect(nested.searchParams.get('state')).toBe(
      'e958e952-ce68-486b-b7ac-d4481bf72151'
    );
  });
});
