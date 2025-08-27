import { Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { database } from '../db/connection';
import { requestAttachments, requestAuditLogs, requests, scholars, users } from '../db/schema';
import {
  GetRequestsQueryDto,
  GetRequestsResponseDto,
  PaginationMetaDto,
  RequestResponseDto,
} from './dto/get-requests.dto';

@Injectable()
export class RequestsService {
  async getRequests(query: GetRequestsQueryDto): Promise<GetRequestsResponseDto> {
    const { page = 1, limit = 20, search, type, status, priority } = query;

    const offset = (page - 1) * limit;

    const whereConditions = [];

    if (search) {
      whereConditions.push(
        or(
          ilike(requests.description, `%${search}%`),
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )
      );
    }

    if (type) {
      whereConditions.push(eq(requests.type, type));
    }

    if (status) {
      whereConditions.push(eq(requests.status, status));
    }

    if (priority) {
      whereConditions.push(eq(requests.priority, priority));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Custom ordering: pending requests first, then by submitted date (newest first)
    const orderByClause = sql`
      CASE 
        WHEN ${requests.status} = 'pending' THEN 0
        WHEN ${requests.status} = 'reviewed' THEN 1
        WHEN ${requests.status} = 'commented' THEN 2
        WHEN ${requests.status} = 'approved' THEN 3
        WHEN ${requests.status} = 'rejected' THEN 4
        ELSE 5
      END,
      ${requests.submittedDate} DESC
    `;

    const requestsWithScholars = await database
      .select({
        request: requests,
        scholar: scholars,
        user: users,
      })
      .from(requests)
      .innerJoin(scholars, eq(requests.scholarId, scholars.id))
      .innerJoin(users, eq(scholars.userId, users.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    const totalCountResult = await database
      .select({ count: count() })
      .from(requests)
      .innerJoin(scholars, eq(requests.scholarId, scholars.id))
      .innerJoin(users, eq(scholars.userId, users.id))
      .where(whereClause);

    const totalItems = totalCountResult[0]?.count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    const requestIds = requestsWithScholars.map((row) => row.request.id);

    const attachments = await this.getAttachments(requestIds);
    const auditLogs = await this.getAuditLogs(requestIds);

    const data: RequestResponseDto[] = requestsWithScholars.map((row) => ({
      id: row.request.id,
      scholarId: row.request.scholarId,
      scholarName: row.user.name,
      scholarEmail: row.user.email,
      type: row.request.type,
      description: row.request.description,
      priority: row.request.priority,
      status: row.request.status,
      submittedDate: row.request.submittedDate,
      reviewedBy: row.request.reviewedBy,
      reviewComment: row.request.reviewComment,
      reviewDate: row.request.reviewDate,
      attachments: attachments[row.request.id] || [],
      auditLogs: auditLogs[row.request.id] || [],
      createdAt: row.request.createdAt,
      updatedAt: row.request.updatedAt,
    }));

    const pagination: PaginationMetaDto = {
      page,
      limit,
      totalItems,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return {
      data,
      pagination,
    };
  }

  private async getAttachments(requestIds: string[]): Promise<Record<string, any[]>> {
    if (requestIds.length === 0) return {};

    const attachmentsData = await database
      .select()
      .from(requestAttachments)
      .where(inArray(requestAttachments.requestId, requestIds))
      .orderBy(desc(requestAttachments.uploadedAt));

    const attachments: Record<string, any[]> = {};
    for (const attachment of attachmentsData) {
      if (!attachments[attachment.requestId]) {
        attachments[attachment.requestId] = [];
      }
      attachments[attachment.requestId].push({
        id: attachment.id,
        name: attachment.name,
        size: attachment.size,
        url: attachment.url,
        mimeType: attachment.mimeType,
        uploadedAt: attachment.uploadedAt,
      });
    }

    return attachments;
  }

  private async getAuditLogs(requestIds: string[]): Promise<Record<string, any[]>> {
    if (requestIds.length === 0) return {};

    const auditLogsData = await database
      .select()
      .from(requestAuditLogs)
      .where(inArray(requestAuditLogs.requestId, requestIds))
      .orderBy(desc(requestAuditLogs.createdAt));

    const auditLogs: Record<string, any[]> = {};
    for (const log of auditLogsData) {
      if (!auditLogs[log.requestId]) {
        auditLogs[log.requestId] = [];
      }
      auditLogs[log.requestId].push({
        id: log.id,
        action: log.action,
        performedBy: log.performedBy,
        previousStatus: log.previousStatus,
        newStatus: log.newStatus,
        comment: log.comment,
        metadata: log.metadata,
        createdAt: log.createdAt,
      });
    }

    return auditLogs;
  }

  async getRequestStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    reviewed: number;
    commented: number;
  }> {
    const statsResult = await database
      .select({
        status: requests.status,
        count: count(),
      })
      .from(requests)
      .groupBy(requests.status);

    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      reviewed: 0,
      commented: 0,
    };

    for (const row of statsResult) {
      stats.total += row.count;
      switch (row.status) {
        case 'pending':
          stats.pending = row.count;
          break;
        case 'approved':
          stats.approved = row.count;
          break;
        case 'rejected':
          stats.rejected = row.count;
          break;
        case 'reviewed':
          stats.reviewed = row.count;
          break;
        case 'commented':
          stats.commented = row.count;
          break;
      }
    }

    return stats;
  }

  async updateRequestStatus(
    requestId: string,
    status: 'approved' | 'rejected' | 'reviewed' | 'commented',
    comment: string,
    reviewedBy: string
  ) {
    const [updatedRequest] = await database
      .update(requests)
      .set({
        status,
        reviewComment: comment,
        reviewedBy,
        reviewDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(requests.id, requestId))
      .returning();

    if (!updatedRequest) {
      throw new NotFoundException(`Request with ID ${requestId} not found`);
    }

    // Create audit log entry
    await database.insert(requestAuditLogs).values({
      requestId,
      action: 'status_changed',
      performedBy: reviewedBy,
      previousStatus: 'pending', // We'll need to get the actual previous status
      newStatus: status,
      comment,
      metadata: JSON.stringify({ reviewedBy, reviewDate: new Date() }),
    });

    return updatedRequest;
  }
}
