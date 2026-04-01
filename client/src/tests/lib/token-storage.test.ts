import { afterEach, describe, expect, it } from 'vitest';
import { tokenStorage } from '@/lib/token-storage';

const ACCESS = 'dobrunia_auth_access';
const REFRESH = 'dobrunia_auth_refresh';

describe('tokenStorage', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('setTokens сохраняет access и refresh, clear очищает', () => {
    expect(tokenStorage.getAccess()).toBeNull();
    tokenStorage.setTokens('a1', 'r1');
    expect(localStorage.getItem(ACCESS)).toBe('a1');
    expect(localStorage.getItem(REFRESH)).toBe('r1');
    expect(tokenStorage.getAccess()).toBe('a1');
    expect(tokenStorage.getRefresh()).toBe('r1');
    tokenStorage.clear();
    expect(tokenStorage.getAccess()).toBeNull();
    expect(tokenStorage.getRefresh()).toBeNull();
  });
});
