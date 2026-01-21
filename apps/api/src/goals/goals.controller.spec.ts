import { Test, type TestingModule } from '@nestjs/testing';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';

describe('GoalsController', () => {
  let controller: GoalsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoalsController],
      providers: [
        {
          provide: GoalsService,
          useValue: {
            getGoalsByUser: jest.fn(),
            createGoal: jest.fn(),
            updateGoal: jest.fn(),
            deleteGoal: jest.fn(),
            getGoalById: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<GoalsController>(GoalsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
