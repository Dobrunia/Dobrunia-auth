import { describe, it, expect } from 'vitest';
import { config } from '../../config/env.config';

describe('Environment Configuration', () => {
  it('should have valid config object structure', () => {
    expect(config).toHaveProperty('database');
    expect(config).toHaveProperty('jwt');
    expect(config).toHaveProperty('app');
  });

  it('should have database config with required fields', () => {
    expect(config.database).toHaveProperty('url');
    expect(config.database).toHaveProperty('host');
    expect(config.database).toHaveProperty('port');
    expect(config.database).toHaveProperty('user');
    expect(config.database).toHaveProperty('password');
    expect(config.database).toHaveProperty('name');
  });

  it('should have app config with default port', () => {
    expect(config.app.port).toBeGreaterThan(0);
    expect(config.app.host).toBeDefined();
  });

  it('should have jwt secrets configured', () => {
    expect(config.jwt.accessSecret).toBeDefined();
    expect(config.jwt.refreshSecret).toBeDefined();
  });
});
