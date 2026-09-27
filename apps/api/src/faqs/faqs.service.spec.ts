import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { database } from '../db/connection';
import { FaqsService } from './faqs.service';

jest.mock('../db/connection');

const mockDatabase = database as unknown as {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

const prepFaq = {
  id: 'faq-prep-1',
  audience: 'prep_year' as const,
  category: 'Documents',
  question: 'Which documents do I upload?',
  answer: 'Upload the required Prep Year documents from My Documents.',
  sortOrder: 1,
  createdBy: 'staff-1',
  updatedBy: 'staff-1',
  createdAt: new Date('2026-09-01'),
  updatedAt: new Date('2026-09-01'),
};

const scholarFaq = {
  id: 'faq-scholar-1',
  audience: 'scholar' as const,
  category: 'Annual review',
  question: 'When is the annual review due?',
  answer: 'Your coordinator will share the deadline in Announcements.',
  sortOrder: 1,
  createdBy: 'staff-1',
  updatedBy: 'staff-1',
  createdAt: new Date('2026-09-01'),
  updatedAt: new Date('2026-09-01'),
};

function mockSelectChain(result: unknown) {
  return {
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockResolvedValue(result),
        limit: jest.fn().mockResolvedValue(result),
      }),
    }),
  };
}

describe('FaqsService', () => {
  let service: FaqsService;

  beforeEach(() => {
    service = new FaqsService();
    jest.clearAllMocks();
  });

  describe('listFaqs', () => {
    it('returns all FAQs when no audience is provided', async () => {
      mockDatabase.select = jest.fn().mockReturnValue(mockSelectChain([prepFaq, scholarFaq]));

      await expect(service.listFaqs()).resolves.toEqual([prepFaq, scholarFaq]);
    });

    it('filters FAQs by audience for staff', async () => {
      mockDatabase.select = jest.fn().mockReturnValue(mockSelectChain([prepFaq]));

      await expect(service.listFaqs('prep_year')).resolves.toEqual([prepFaq]);
    });
  });

  describe('getFaqsForScholar', () => {
    it('returns only FAQs for the scholar programme stage', async () => {
      mockDatabase.select = jest
        .fn()
        .mockReturnValueOnce(mockSelectChain([{ programStage: 'prep_year' }]))
        .mockReturnValueOnce(mockSelectChain([prepFaq]));

      await expect(service.getFaqsForScholar('user-1')).resolves.toEqual([prepFaq]);
    });

    it('returns an empty list when the user has no scholar profile', async () => {
      mockDatabase.select = jest.fn().mockReturnValueOnce(mockSelectChain([]));

      await expect(service.getFaqsForScholar('user-1')).resolves.toEqual([]);
    });

    it('rejects an unauthenticated scholar lookup', async () => {
      await expect(service.getFaqsForScholar('')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('createFaq', () => {
    it('creates an FAQ for the authenticated staff user', async () => {
      mockDatabase.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([prepFaq]),
        }),
      });

      const result = await service.createFaq(
        {
          audience: 'prep_year',
          category: 'Documents',
          question: 'Which documents do I upload?',
          answer: 'Upload the required Prep Year documents from My Documents.',
          sortOrder: 1,
        },
        'staff-1'
      );

      expect(result).toEqual(prepFaq);
      expect(mockDatabase.insert).toHaveBeenCalled();
    });

    it('rejects create without a staff user id', async () => {
      await expect(
        service.createFaq(
          {
            audience: 'scholar',
            question: 'How do I submit a request?',
            answer: 'Open My Requests and choose the request type.',
          },
          ''
        )
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('updateFaq', () => {
    it('updates an existing FAQ', async () => {
      const updated = { ...prepFaq, question: 'What documents are required?' };
      mockDatabase.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updated]),
          }),
        }),
      });

      await expect(
        service.updateFaq('faq-prep-1', { question: 'What documents are required?' }, 'staff-1')
      ).resolves.toEqual(updated);
    });

    it('throws when the FAQ does not exist', async () => {
      mockDatabase.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        service.updateFaq('missing', { question: 'Gone?' }, 'staff-1')
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteFaq', () => {
    it('deletes an existing FAQ', async () => {
      mockDatabase.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'faq-prep-1' }]),
        }),
      });

      await expect(service.deleteFaq('faq-prep-1')).resolves.toEqual({ success: true });
    });

    it('throws when deleting a missing FAQ', async () => {
      mockDatabase.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([]),
        }),
      });

      await expect(service.deleteFaq('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
