import { describe, it, expect } from 'vitest';
import { ROUTES, APP_NAME } from '../../constants/app.constants';

describe('Frontend Constants', () => {
  it('should have valid route constants', () => {
    expect(ROUTES.HOME).toEqual('/');
    expect(ROUTES.LOGIN).toEqual('/login');
    expect(ROUTES.REGISTER).toEqual('/register');
  });

  it('should have valid app name', () => {
    expect(APP_NAME).toEqual('Dobrunia Auth');
  });
});
