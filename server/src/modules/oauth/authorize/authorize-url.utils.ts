export function buildAuthWebBridgeUrl(authWebUrl: string, returnUrl: string): string {
  const bridge = new URL('/', `${authWebUrl}/`);
  bridge.searchParams.set('oauth_bridge', '1');
  bridge.searchParams.set('return_url', returnUrl);
  return bridge.toString();
}
