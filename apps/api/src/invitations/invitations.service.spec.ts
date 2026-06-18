import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { getDatabase } from '../db/connection';
import { InvitationsService } from './invitations.service';

jest.mock('../db/connection', () => ({
  getDatabase: jest.fn(),
}));

describe('InvitationsService', () => {
  let service: InvitationsService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        BETTER_AUTH_URL: 'http://localhost:4000',
        SCHOLAR_APP_URL: 'http://localhost:4002',
        STAFF_APP_URL: 'http://localhost:4001',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('marks stale pending invitations as expired before listing invitations', async () => {
    const expiredSet = jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(undefined),
    });
    const listResults = [
      {
        id: 'invitation-1',
        email: 'scholar@example.com',
        userType: 'scholar',
        status: 'expired',
        expiresAt: new Date('2026-05-20T00:00:00.000Z'),
        acceptedAt: null,
        sentAt: new Date('2026-05-13T00:00:00.000Z'),
        lastResentAt: null,
        resentCount: '0',
        invitedBy: 'staff-1',
        createdAt: new Date('2026-05-13T00:00:00.000Z'),
      },
    ];
    const orderBy = jest.fn().mockResolvedValue(listResults);

    const db = {
      update: jest.fn().mockReturnValue({ set: expiredSet }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          orderBy,
        }),
      }),
    };
    (getDatabase as jest.Mock).mockReturnValue(db);

    const result = await service.listInvitations();

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(expiredSet).toHaveBeenCalledWith({
      status: 'expired',
      updatedAt: expect.any(Date),
    });
    expect(orderBy).toHaveBeenCalled();
    expect(result).toEqual(listResults);
  });

  it('filters after reconciling expired pending invitations', async () => {
    const expiredSet = jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(undefined),
    });
    const where = jest.fn().mockReturnValue({
      orderBy: jest.fn().mockResolvedValue([]),
    });

    const db = {
      update: jest.fn().mockReturnValue({ set: expiredSet }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where,
        }),
      }),
    };
    (getDatabase as jest.Mock).mockReturnValue(db);

    await service.listInvitations('expired');

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(expiredSet).toHaveBeenCalledWith({
      status: 'expired',
      updatedAt: expect.any(Date),
    });
    expect(where).toHaveBeenCalled();
  });

  it('resends an expired invitation by making it pending and refreshing expiry', async () => {
    const expiredInvitation = {
      id: 'invitation-1',
      email: 'scholar@example.com',
      userType: 'scholar',
      status: 'expired',
      token: 'token-123',
      expiresAt: new Date('2026-05-20T00:00:00.000Z'),
      resentCount: '2',
    };
    const setCalls: Array<Record<string, unknown>> = [];
    const set = jest.fn((values: Record<string, unknown>) => {
      setCalls.push(values);
      return {
        where: jest.fn().mockResolvedValue(undefined),
      };
    });
    const limit = jest.fn().mockResolvedValue([expiredInvitation]);

    const db = {
      update: jest.fn().mockReturnValue({ set }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit,
          }),
        }),
      }),
    };
    (getDatabase as jest.Mock).mockReturnValue(db);
    jest
      .spyOn(
        service as unknown as {
          sendInvitationEmail: (
            email: string,
            inviteUrl: string,
            userType: string
          ) => Promise<void>;
        },
        'sendInvitationEmail'
      )
      .mockResolvedValue(undefined);

    const result = await service.resendInvitation('invitation-1', 'staff-1');
    const resendUpdate = setCalls[1];

    expect(result).toEqual({
      message: 'Invitation resent successfully',
      resentCount: 3,
    });
    expect(resendUpdate).toMatchObject({
      status: 'pending',
      lastResentAt: expect.any(Date),
      resentCount: '3',
      updatedAt: expect.any(Date),
    });
    expect(resendUpdate.expiresAt).toBeInstanceOf(Date);
    expect((resendUpdate.expiresAt as Date).getTime()).toBeGreaterThan(Date.now());
  });

  it('keeps non-resendable invitation statuses blocked', async () => {
    const acceptedInvitation = {
      id: 'invitation-1',
      email: 'scholar@example.com',
      userType: 'scholar',
      status: 'accepted',
      token: 'token-123',
      expiresAt: new Date('2026-07-20T00:00:00.000Z'),
      resentCount: '0',
    };
    const set = jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(undefined),
    });

    const db = {
      update: jest.fn().mockReturnValue({ set }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([acceptedInvitation]),
          }),
        }),
      }),
    };
    (getDatabase as jest.Mock).mockReturnValue(db);

    await expect(service.resendInvitation('invitation-1', 'staff-1')).rejects.toThrow(
      'Cannot resend invitation with status: accepted'
    );
  });
});
