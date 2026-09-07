import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, type TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import { StaffGuard } from '../auth/staff.guard';
import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';

const scholarId = '11111111-1111-4111-8111-111111111111';

describe('ProposalsController', () => {
  let controller: ProposalsController;
  const service = {
    getMine: jest.fn(),
    saveDraft: jest.fn(),
    submit: jest.fn(),
    addScholarComment: jest.fn(),
    listInbox: jest.fn(),
    getForScholar: jest.fn(),
    review: jest.fn(),
    addStaffComment: jest.fn(),
    attachResource: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProposalsController],
      providers: [{ provide: ProposalsService, useValue: service }],
    }).compile();
    controller = module.get(ProposalsController);
  });

  it('guards scholar routes with AuthGuard and staff routes with StaffGuard', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ProposalsController.prototype.getMine)).toEqual(
      expect.arrayContaining([AuthGuard])
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, ProposalsController.prototype.listInbox)).toEqual(
      expect.arrayContaining([StaffGuard])
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, ProposalsController.prototype.review)).toEqual(
      expect.arrayContaining([StaffGuard])
    );
  });

  it('passes the authenticated user into scholar writes', async () => {
    service.submit.mockResolvedValue({ currentStepKey: 'topic' });
    await expect(
      controller.submit('topic', { body: 'Draft' }, { user: { id: 'scholar-1' } } as never)
    ).resolves.toEqual({ currentStepKey: 'topic' });
    expect(service.submit).toHaveBeenCalledWith('scholar-1', 'topic', 'Draft');
  });

  it('passes staff review through to the lock', async () => {
    service.review.mockResolvedValue({ currentStepKey: 'outline' });
    await expect(
      controller.review(scholarId, 'topic', { action: 'approve', comment: 'Go' }, {
        user: { id: 'staff-1' },
      } as never)
    ).resolves.toEqual({ currentStepKey: 'outline' });
    expect(service.review).toHaveBeenCalledWith(scholarId, 'topic', 'staff-1', 'approve', 'Go');
  });
});
