import { describe, expect, it } from 'vitest';
import {
  clientRegistrationBodySchema,
  clientUpdateBodySchema,
} from '../../../utils/schemas/client-registration.schema';

describe('client registration schemas', () => {
  it('нормализует slug и разрешает HTTP только для loopback-разработки', () => {
    const result = clientRegistrationBodySchema.parse({
      name: 'Local App',
      slug: ' Local-App ',
      baseUrl: 'http://localhost:5173',
      redirectUris: [
        'http://127.0.0.1:5173/callback',
        'http://[::1]:5173/callback',
      ],
    });

    expect(result.slug).toBe('local-app');
  });

  it.each([
    'http://public.example/callback',
    'https://user:password@app.example/callback',
    'https://app.example/callback#token',
    'javascript:alert(1)',
    'relative/callback',
  ])('отклоняет небезопасный или не абсолютный URL: %s', (redirectUri) => {
    const result = clientRegistrationBodySchema.safeParse({
      name: 'Unsafe App',
      slug: 'unsafe-app',
      redirectUris: [redirectUri],
    });

    expect(result.success).toBe(false);
  });

  it('не принимает неизвестные поля и попытку назначить владельца', () => {
    const result = clientRegistrationBodySchema.safeParse({
      name: 'Injected App',
      slug: 'injected-app',
      redirectUris: ['https://app.example/callback'],
      ownerUserId: 'another-user',
      isActive: false,
    });

    expect(result.success).toBe(false);
  });

  it('ограничивает callback URL десятью уникальными адресами', () => {
    const tooMany = Array.from(
      { length: 11 },
      (_, index) => `https://app.example/callback/${index}`
    );
    const tooManyResult = clientRegistrationBodySchema.safeParse({
      name: 'Large App',
      slug: 'large-app',
      redirectUris: tooMany,
    });
    const duplicateResult = clientRegistrationBodySchema.safeParse({
      name: 'Duplicate App',
      slug: 'duplicate-app',
      redirectUris: [
        'https://app.example/callback',
        'https://app.example/callback',
      ],
    });

    expect(tooManyResult.success).toBe(false);
    expect(duplicateResult.success).toBe(false);
  });

  it('требует хотя бы одно допустимое поле при обновлении', () => {
    expect(clientUpdateBodySchema.safeParse({}).success).toBe(false);
    expect(clientUpdateBodySchema.safeParse({ ownerUserId: 'another-user' }).success).toBe(
      false
    );
    expect(clientUpdateBodySchema.safeParse({ redirectUris: [] }).success).toBe(false);
  });

  it('разрешает очищать необязательные URL и деактивировать приложение', () => {
    expect(
      clientUpdateBodySchema.parse({
        baseUrl: '',
        logoUrl: '',
        isActive: false,
      })
    ).toEqual({
      baseUrl: '',
      logoUrl: '',
      isActive: false,
    });
  });
});
