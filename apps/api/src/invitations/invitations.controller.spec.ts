import { Test, type TestingModule } from '@nestjs/testing';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

describe('InvitationsController', () => {
  let controller: InvitationsController;

  const mockInvitationsService = {
    getInvitationByCode: jest.fn(),
    acceptInvitation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationsController],
      providers: [
        {
          provide: InvitationsService,
          useValue: mockInvitationsService,
        },
      ],
    }).compile();

    controller = module.get<InvitationsController>(InvitationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
