import { describe, expect, it } from 'vitest';
import { getSessionAgentDetails } from '@/lib/session-agent';

describe('getSessionAgentDetails', () => {
  it('распознает desktop Chrome на Windows', () => {
    const details = getSessionAgentDetails(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    );

    expect(details.browser.name).toBe('Google Chrome');
    expect(details.os.name).toBe('Windows');
    expect(details.device.name).toBe('Ноутбук или настольный компьютер');
    expect(details.primaryLabel).toBe('Google Chrome на Windows');
  });

  it('распознает Safari на iPhone', () => {
    const details = getSessionAgentDetails(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
    );

    expect(details.browser.name).toBe('Safari');
    expect(details.os.name).toBe('iOS');
    expect(details.device.family).toBe('mobile');
  });

  it('возвращает fallback для пустого user-agent', () => {
    const details = getSessionAgentDetails(null);

    expect(details.browser.known).toBe(false);
    expect(details.os.known).toBe(false);
    expect(details.device.family).toBe('unknown');
  });
});
