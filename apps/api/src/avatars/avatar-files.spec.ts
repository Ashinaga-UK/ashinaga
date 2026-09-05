import {
  buildAvatarPublicUrl,
  buildPendingAvatarFileKey,
  buildPermanentAvatarFileKey,
  isPendingAvatarFileKey,
  isPermanentAvatarFileKey,
  isStoredAvatarKey,
  resolveAvatarSrc,
} from './avatar-files';

describe('avatar-files', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    process.env.BETTER_AUTH_URL = 'http://localhost:4000';
  });

  it('builds pending and permanent keys under avatars/', () => {
    expect(buildPendingAvatarFileKey(userId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')).toBe(
      `avatars/pending/${userId}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`
    );
    expect(buildPermanentAvatarFileKey(userId, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')).toBe(
      `avatars/${userId}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg`
    );
  });

  it('validates pending ownership and rejects path tricks', () => {
    const key = `avatars/pending/${userId}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`;
    expect(isPendingAvatarFileKey(key, userId)).toBe(true);
    expect(
      isPendingAvatarFileKey(
        'avatars/pending/22222222-2222-4222-8222-222222222222/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg',
        userId
      )
    ).toBe(false);
    expect(isPendingAvatarFileKey(`avatars/pending/${userId}/../secret.jpg`, userId)).toBe(false);
  });

  it('detects permanent keys', () => {
    const key = `avatars/${userId}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg`;
    expect(isPermanentAvatarFileKey(key, userId)).toBe(true);
    expect(isPermanentAvatarFileKey(key)).toBe(true);
    expect(isPermanentAvatarFileKey(`avatars/pending/${userId}/x.jpg`, userId)).toBe(false);
  });

  it('resolves stored keys to stable API URLs and leaves legacy values', () => {
    const key = `avatars/${userId}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg`;
    expect(resolveAvatarSrc(key, userId)).toBe(buildAvatarPublicUrl(userId));
    expect(resolveAvatarSrc('https://api.dicebear.com/x.png', userId)).toBe(
      'https://api.dicebear.com/x.png'
    );
    expect(resolveAvatarSrc('data:image/jpeg;base64,abc', userId)).toBe(
      'data:image/jpeg;base64,abc'
    );
    expect(resolveAvatarSrc(null, userId)).toBeNull();
    expect(isStoredAvatarKey(key)).toBe(true);
  });
});
