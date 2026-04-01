const ACCESS = 'dobrunia_auth_access';
const REFRESH = 'dobrunia_auth_refresh';

export const tokenStorage = {
  getAccess(): string | null {
    return localStorage.getItem(ACCESS);
  },
  getRefresh(): string | null {
    return localStorage.getItem(REFRESH);
  },
  setTokens(access: string, refresh: string): void {
    localStorage.setItem(ACCESS, access);
    localStorage.setItem(REFRESH, refresh);
  },
  clear(): void {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
};
