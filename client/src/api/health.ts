import { clientConfig } from '@/config';

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${clientConfig.apiUrl}/health`, { method: 'GET' });
    if (!res.ok) {
      return false;
    }
    const data = (await res.json()) as { status?: string };
    return data?.status === 'ok';
  } catch {
    return false;
  }
}
