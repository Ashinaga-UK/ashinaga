import { BadRequestException } from '@nestjs/common';
import { validateProfileImage } from './profile-image';

describe('validateProfileImage', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  it('allows empty values', () => {
    expect(() => validateProfileImage(null, userId)).not.toThrow();
    expect(() => validateProfileImage(undefined, userId)).not.toThrow();
    expect(() => validateProfileImage('', userId)).not.toThrow();
  });

  it('allows a pending avatar key owned by the user', () => {
    expect(() =>
      validateProfileImage(`avatars/pending/${userId}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`, userId)
    ).not.toThrow();
  });

  it('rejects data URLs for new writes', () => {
    expect(() => validateProfileImage('data:image/jpeg;base64,abc', userId)).toThrow(
      BadRequestException
    );
    expect(() => validateProfileImage('data:image/jpeg;base64,abc', userId)).toThrow(
      'uploaded to object storage'
    );
  });

  it('rejects foreign pending keys and https URLs', () => {
    expect(() =>
      validateProfileImage(
        'avatars/pending/22222222-2222-4222-8222-222222222222/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg',
        userId
      )
    ).toThrow(BadRequestException);
    expect(() => validateProfileImage('https://example.com/photo.jpg', userId)).toThrow(
      BadRequestException
    );
  });
});
