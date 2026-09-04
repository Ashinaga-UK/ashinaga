import { BadRequestException } from '@nestjs/common';
import { assertHttpUrl, toSafeHttpUrl } from './http-url';

describe('toSafeHttpUrl', () => {
  it('allows http and https', () => {
    expect(toSafeHttpUrl('https://example.com/path')).toBe('https://example.com/path');
    expect(toSafeHttpUrl('http://localhost:4002')).toBe('http://localhost:4002/');
  });

  it('rejects javascript and missing protocol', () => {
    expect(toSafeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(toSafeHttpUrl('ftp://files.example')).toBeNull();
    expect(toSafeHttpUrl('example.com')).toBeNull();
    expect(toSafeHttpUrl('')).toBeNull();
  });
});

describe('assertHttpUrl', () => {
  it('throws when the URL is not http(s)', () => {
    expect(() => assertHttpUrl('ftp://files.example')).toThrow(BadRequestException);
  });
});
