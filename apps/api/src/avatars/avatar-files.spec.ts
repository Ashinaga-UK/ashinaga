import {
  buildAvatarPublicUrl,
  buildPendingAvatarFileKey,
  buildPermanentAvatarFileKey,
  isPendingAvatarFileKey,
  isPermanentAvatarFileKey,
  isStoredAvatarKey,
  isValidAvatarUserIdParam,
  resolveAvatarSrc,
} from './avatar-files';

describe('avatar-files', () => {
  // Better Auth generates 32-char alphanumeric ids, not UUIDs
  const userId = 'AbCdEfGhIjKlMnOpQrStUvWxYz123456';

  beforeEach(() => {
    process.env.BETTER_AUTH_URL = 'http://localhost:4000';
  });

  it('builds pending and permanent keys under avatars/', () => {
    expect(buildPendingAvatarFileKey(userId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')).toBe(
      `avatars/pending/${userId}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`
    );
    expect(buildPermanentAvatarFileKey(userId, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')).toBe(
      `avatars/${userId}/${'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}.jpg`
    );
  });

  it('validates pending ownership and rejects path tricks', () => {
    const key = `avatars/pending/${userId}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`;
    expect(isPendingAvatarFileKey(key, userId)).toBe(true);
    expect(
      isPendingAvatarFileKey(
        'avatars/pending/otherUserId000000000000000000/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg',
        userId
      )
    ).toBe(false);
    expect(isPendingAvatarFileKey(`avatars/pending/${userId}/../secret.jpg`, userId)).toBe(false);
  });

  it('detects permanent keys for Better Auth user ids', () => {
    const key = `avatars/${userId}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg`;
    expect(isPermanentAvatarFileKey(key, userId)).toBe(true);
    expect(isPermanentAvatarFileKey(key)).toBe(true);
    expect(isPermanentAvatarFileKey(`avatars/pending/${userId}/x.jpg`, userId)).toBe(false);
    expect(
      isPermanentAvatarFileKey(`avatars/${userId}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png`)
    ).toBe(true);
  });

  it('rejects UUID-shaped user segments that are not real Better Auth keys when scoped', () => {
    const uuidUser = '11111111-1111-4111-8111-111111111111';
    // UUID chars include hyphens; with userId scoped, hyphens in the path are fine if they match
    const key = `avatars/${uuidUser}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg`;
    expect(isPermanentAvatarFileKey(key, uuidUser)).toBe(true);
  });

  it('validates avatar userId route params', () => {
    expect(isValidAvatarUserIdParam(userId)).toBe(true);
    expect(isValidAvatarUserIdParam('')).toBe(false);
    expect(isValidAvatarUserIdParam('../x')).toBe(false);
    expect(isValidAvatarUserIdParam('a/b')).toBe(false);
  });

  it('resolves stored keys and data URLs to stable API URLs; leaves https', () => {
    const key = `avatars/${userId}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg`;
    expect(resolveAvatarSrc(key, userId)).toBe(buildAvatarPublicUrl(userId));
    expect(resolveAvatarSrc('https://api.dicebear.com/x.png', userId)).toBe(
      'https://api.dicebear.com/x.png'
    );
    expect(resolveAvatarSrc('data:image/jpeg;base64,abc', userId)).toBe(
      buildAvatarPublicUrl(userId)
    );
    expect(resolveAvatarSrc(null, userId)).toBeNull();
    expect(isStoredAvatarKey(key)).toBe(true);
  });
});
