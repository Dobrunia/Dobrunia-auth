import { describe, it, expect } from 'vitest';
import { hashRefreshToken } from '../../../modules/auth/token.utils';

describe('hashRefreshToken', () => {
  it('returns stable hex sha256', () => {
    const h = hashRefreshToken('same-token');
    expect(h).toMatch(/^[a-f0-9]{64}$/);
    expect(hashRefreshToken('same-token')).toBe(h);
  });

  it('differs for different inputs', () => {
    expect(hashRefreshToken('a')).not.toBe(hashRefreshToken('b'));
  });
});
