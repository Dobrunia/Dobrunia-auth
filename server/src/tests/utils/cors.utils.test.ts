import { describe, expect, it } from 'vitest';
import { isReflectableOrigin, mergeCorsOriginsCsv, originFromPublicUrl } from '../../utils/cors.utils';

describe('originFromPublicUrl', () => {
  it('возвращает origin для полного URL', () => {
    expect(originFromPublicUrl('https://auth.example.com/app')).toBe('https://auth.example.com');
  });
  it('null для пустой строки', () => {
    expect(originFromPublicUrl('')).toBeNull();
  });
});

describe('mergeCorsOriginsCsv', () => {
  it('добавляет origin из AUTH_WEB без дубликата', () => {
    const out = mergeCorsOriginsCsv(
      'https://shop.example,https://shop.example',
      'https://auth.example.com/path'
    );
    expect(out.sort()).toEqual(['https://auth.example.com', 'https://shop.example'].sort());
  });
  it('без AUTH_WEB только список', () => {
    expect(mergeCorsOriginsCsv('http://localhost:5174', '')).toEqual(['http://localhost:5174']);
  });
});

describe('isReflectableOrigin', () => {
  it('https проходит при httpsOnly', () => {
    expect(isReflectableOrigin('https://evil.example', true)).toBe(true);
  });
  it('http не проходит при httpsOnly (кроме localhost)', () => {
    expect(isReflectableOrigin('http://evil.example', true)).toBe(false);
    expect(isReflectableOrigin('http://localhost:5173', true)).toBe(true);
    expect(isReflectableOrigin('http://127.0.0.1:5173', true)).toBe(true);
  });
  it('при httpsOnly=false http разрешён', () => {
    expect(isReflectableOrigin('http://app.example', false)).toBe(true);
  });
  it('отсекает не http(s)', () => {
    expect(isReflectableOrigin('javascript:alert(1)', false)).toBe(false);
  });
});
