import { BadRequestException } from '@nestjs/common';
import { validateProfileImage } from './profile-image';

describe('validateProfileImage', () => {
  it('allows empty values so a picture can be removed', () => {
    expect(() => validateProfileImage(null)).not.toThrow();
    expect(() => validateProfileImage(undefined)).not.toThrow();
    expect(() => validateProfileImage('')).not.toThrow();
  });

  it('accepts JPEG data URLs including the image/jpg alias', () => {
    expect(() =>
      validateProfileImage('data:image/jpeg;base64,abc')
    ).not.toThrow();
    expect(() => validateProfileImage('data:image/jpg;base64,abc')).not.toThrow();
  });

  it('rejects unsupported image types', () => {
    expect(() => validateProfileImage('data:image/svg+xml;base64,abc')).toThrow(
      BadRequestException
    );
    expect(() => validateProfileImage('data:image/pjpeg;base64,abc')).toThrow(
      BadRequestException
    );
    expect(() => validateProfileImage('https://example.com/photo.jpg')).toThrow(
      BadRequestException
    );
  });

  it('rejects data URLs over the maximum length', () => {
    const oversized = `data:image/jpeg;base64,${'a'.repeat(3_000_000)}`;
    expect(() => validateProfileImage(oversized)).toThrow(BadRequestException);
    expect(() => validateProfileImage(oversized)).toThrow('Profile image is too large to save');
  });
});
