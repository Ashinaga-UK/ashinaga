import { OrphanedScholarError, restoreOrphanedCandidate } from './restore-orphaned-candidate';

function mockDb(options: {
  user?: { id: string; email: string; name: string; userType: string } | null;
  scholar?: { id: string; programStage: string } | null;
  insertedId?: string;
}) {
  const limit = jest
    .fn()
    .mockResolvedValueOnce(options.user ? [options.user] : [])
    .mockResolvedValueOnce(options.scholar ? [options.scholar] : []);
  const where = jest.fn().mockReturnValue({ limit });
  const from = jest.fn().mockReturnValue({ where });
  const returning = jest.fn().mockResolvedValue([{ id: options.insertedId ?? 'scholar-1' }]);
  const values = jest.fn().mockReturnValue({ returning });
  const insert = jest.fn().mockReturnValue({ values });

  return {
    db: {
      select: jest.fn().mockReturnValue({ from }),
      insert,
    },
    insert,
    values,
  };
}

describe('restoreOrphanedCandidate', () => {
  it('creates a prep year profile for a scholar login with no profile', async () => {
    const { db, values } = mockDb({
      user: {
        id: 'user-1',
        email: 'ada@example.com',
        name: 'Ada Prep',
        userType: 'scholar',
      },
      scholar: null,
      insertedId: 'scholar-new',
    });

    const result = await restoreOrphanedCandidate(db as never, 'Ada@Example.com');

    expect(result).toEqual({
      scholarId: 'scholar-new',
      userId: 'user-1',
      email: 'ada@example.com',
      name: 'Ada Prep',
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        programStage: 'prep_year',
        status: 'active',
        program: 'TBD',
        year: 'TBD',
        university: 'TBD',
      })
    );
  });

  it('refuses when no account exists', async () => {
    const { db } = mockDb({ user: null });
    await expect(restoreOrphanedCandidate(db as never, 'missing@example.com')).rejects.toThrow(
      OrphanedScholarError
    );
  });

  it('refuses a staff account', async () => {
    const { db, insert } = mockDb({
      user: {
        id: 'user-1',
        email: 'staff@example.com',
        name: 'Staff',
        userType: 'staff',
      },
    });

    await expect(restoreOrphanedCandidate(db as never, 'staff@example.com')).rejects.toThrow(
      'staff account'
    );
    expect(insert).not.toHaveBeenCalled();
  });

  it('refuses when the profile is still there', async () => {
    const { db, insert } = mockDb({
      user: {
        id: 'user-1',
        email: 'ada@example.com',
        name: 'Ada',
        userType: 'scholar',
      },
      scholar: { id: 'scholar-1', programStage: 'scholar' },
    });

    await expect(restoreOrphanedCandidate(db as never, 'ada@example.com')).rejects.toThrow(
      'still has a profile'
    );
    expect(insert).not.toHaveBeenCalled();
  });
});
