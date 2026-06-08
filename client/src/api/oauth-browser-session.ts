import { clientConfig } from '@/config';

/**
 * Top-level POST ставит API-cookie в first-party контексте и не зависит от third-party cookie policy.
 */
export function submitOAuthBrowserSession(
  accessToken: string,
  clientId: string,
  returnUrl: string
): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `${clientConfig.apiUrl}/oauth/browser-session`;
  form.style.display = 'none';

  for (const [name, value] of Object.entries({ accessToken, clientId, returnUrl })) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.append(input);
  }

  document.body.append(form);
  form.submit();
}
