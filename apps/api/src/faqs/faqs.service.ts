import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { database } from '../db/connection';
import { faqs, scholars } from '../db/schema';
import type { CreateFaqDto, FaqAudience } from './dto/create-faq.dto';
import type { UpdateFaqDto } from './dto/update-faq.dto';

export type FaqRecord = typeof faqs.$inferSelect;

export type ScholarFaq = Pick<
  FaqRecord,
  'id' | 'audience' | 'category' | 'question' | 'answer' | 'sortOrder' | 'createdAt' | 'updatedAt'
>;

export function toScholarFaq(row: FaqRecord): ScholarFaq {
  return {
    id: row.id,
    audience: row.audience,
    category: row.category,
    question: row.question,
    answer: row.answer,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class FaqsService {
  async listFaqs(audience?: FaqAudience): Promise<FaqRecord[]> {
    const conditions = audience ? [eq(faqs.audience, audience)] : [];

    return database
      .select()
      .from(faqs)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(faqs.audience), asc(faqs.sortOrder), asc(faqs.createdAt));
  }

  async getFaqsForScholar(userId: string): Promise<ScholarFaq[]> {
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const [scholar] = await database
      .select({ programStage: scholars.programStage })
      .from(scholars)
      .where(eq(scholars.userId, userId))
      .limit(1);

    if (!scholar) {
      return [];
    }

    const rows = await database
      .select()
      .from(faqs)
      .where(eq(faqs.audience, scholar.programStage))
      .orderBy(asc(faqs.sortOrder), asc(faqs.createdAt));

    return rows.map(toScholarFaq);
  }

  async createFaq(dto: CreateFaqDto, userId: string): Promise<FaqRecord> {
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const [created] = await database
      .insert(faqs)
      .values({
        audience: dto.audience,
        category: dto.category ?? null,
        question: dto.question,
        answer: dto.answer,
        sortOrder: dto.sortOrder ?? 0,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return created;
  }

  async updateFaq(id: string, dto: UpdateFaqDto, userId: string): Promise<FaqRecord> {
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const [updated] = await database
      .update(faqs)
      .set({
        ...(dto.audience !== undefined ? { audience: dto.audience } : {}),
        ...(dto.category !== undefined ? { category: dto.category ?? null } : {}),
        ...(dto.question !== undefined ? { question: dto.question } : {}),
        ...(dto.answer !== undefined ? { answer: dto.answer } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(faqs.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException('FAQ not found');
    }

    return updated;
  }

  async deleteFaq(id: string): Promise<{ success: true }> {
    const [deleted] = await database.delete(faqs).where(eq(faqs.id, id)).returning({ id: faqs.id });

    if (!deleted) {
      throw new NotFoundException('FAQ not found');
    }

    return { success: true };
  }
}
