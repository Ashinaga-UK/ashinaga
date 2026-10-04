import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import type { CreateFaqDto } from './dto/create-faq.dto';
import type { UpdateFaqDto } from './dto/update-faq.dto';
import { FaqsController } from './faqs.controller';
import { FaqsService } from './faqs.service';

type RequestWithUser = Request & {
  user: {
    id: string;
  };
};

describe('FaqsController', () => {
  let controller: FaqsController;
  let service: FaqsService;

  const mockFaqsService = {
    listFaqs: jest.fn(),
    getFaqsForScholar: jest.fn(),
    createFaq: jest.fn(),
    updateFaq: jest.fn(),
    deleteFaq: jest.fn(),
  };

  const makeRequest = (userId: string) =>
    ({
      user: {
        id: userId,
      },
    }) as RequestWithUser;

  const mockFaq = {
    id: 'faq-1',
    audience: 'prep_year' as const,
    category: 'Documents',
    question: 'Which documents do I upload?',
    answer: 'Use My Documents.',
    sortOrder: 0,
    createdBy: 'staff-1',
    updatedBy: 'staff-1',
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FaqsController],
      providers: [
        {
          provide: FaqsService,
          useValue: mockFaqsService,
        },
      ],
    }).compile();

    controller = module.get<FaqsController>(FaqsController);
    service = module.get<FaqsService>(FaqsService);
    jest.clearAllMocks();
  });

  it('lists FAQs for staff, optionally filtered by audience', async () => {
    mockFaqsService.listFaqs.mockResolvedValue([mockFaq]);

    await expect(controller.listFaqs({ audience: 'prep_year' })).resolves.toEqual([mockFaq]);
    expect(service.listFaqs).toHaveBeenCalledWith('prep_year');
  });

  it('creates an FAQ for the authenticated staff user', async () => {
    const dto: CreateFaqDto = {
      audience: 'prep_year',
      question: 'Which documents do I upload?',
      answer: 'Use My Documents.',
    };
    mockFaqsService.createFaq.mockResolvedValue(mockFaq);

    await expect(controller.createFaq(dto, makeRequest('staff-1'))).resolves.toEqual(mockFaq);
    expect(service.createFaq).toHaveBeenCalledWith(dto, 'staff-1');
  });

  it('returns stage-filtered FAQs for the authenticated scholar', async () => {
    mockFaqsService.getFaqsForScholar.mockResolvedValue([mockFaq]);

    await expect(controller.getMyFaqs(makeRequest('scholar-1'))).resolves.toEqual([mockFaq]);
    expect(service.getFaqsForScholar).toHaveBeenCalledWith('scholar-1');
  });

  it('updates an FAQ for the authenticated staff user', async () => {
    const dto: UpdateFaqDto = { question: 'Updated question' };
    mockFaqsService.updateFaq.mockResolvedValue({ ...mockFaq, ...dto });

    await expect(controller.updateFaq('faq-1', dto, makeRequest('staff-1'))).resolves.toEqual({
      ...mockFaq,
      ...dto,
    });
    expect(service.updateFaq).toHaveBeenCalledWith('faq-1', dto, 'staff-1');
  });

  it('deletes an FAQ', async () => {
    mockFaqsService.deleteFaq.mockResolvedValue({ success: true });

    await expect(controller.deleteFaq('faq-1')).resolves.toEqual({ success: true });
    expect(service.deleteFaq).toHaveBeenCalledWith('faq-1');
  });
});
