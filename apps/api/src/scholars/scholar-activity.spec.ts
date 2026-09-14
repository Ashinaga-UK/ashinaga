import { getDatabase } from '../db/connection';
import { touchScholarLastActivity } from './scholar-activity';

jest.mock('../db/connection', () => ({
  getDatabase: jest.fn(),
}));

describe('touchScholarLastActivity', () => {
  const mockDb = {
    select: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
    limit: jest.fn(),
    update: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.select.mockReturnValue(mockDb);
    mockDb.from.mockReturnValue(mockDb);
    mockDb.where.mockReturnValue(mockDb);
    mockDb.limit.mockResolvedValue([]);
    mockDb.update.mockReturnValue(mockDb);
    mockDb.set.mockReturnValue(mockDb);
    (getDatabase as jest.Mock).mockReturnValue(mockDb);
  });

  it('does nothing when the user has no scholar row', async () => {
    await touchScholarLastActivity('user-1', new Date('2026-09-09T12:00:00.000Z'));
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('skips writes inside the throttle window', async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: 'scholar-1', lastActivity: new Date('2026-09-09T10:00:00.000Z') },
    ]);
    await touchScholarLastActivity('user-1', new Date('2026-09-09T12:00:00.000Z'));
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('writes when lastActivity is missing or older than the throttle', async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: 'scholar-1', lastActivity: null }]);
    mockDb.where.mockReturnValueOnce(mockDb).mockResolvedValueOnce(undefined);
    await touchScholarLastActivity('user-1', new Date('2026-09-09T12:00:00.000Z'));
    expect(mockDb.update).toHaveBeenCalled();
  });
});
