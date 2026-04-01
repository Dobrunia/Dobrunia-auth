const ACCESS = 'dobrunia_example_access';
const REFRESH = 'dobrunia_example_refresh';

export const tokens = {
  getAccess(): string | null {
    return localStorage.getItem(ACCESS);
  },
  setPair(access: string, refresh: string): void {
    localStorage.setItem(ACCESS, access);
    localStorage.setItem(REFRESH, refresh);
  },
  clear(): void {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
};
