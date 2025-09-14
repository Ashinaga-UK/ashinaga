import { Body, Controller, Get, Param, Post, Query, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CreateRequestDto, CreateRequestResponseDto } from './dto/create-request.dto';
import { GetRequestsQueryDto, GetRequestsResponseDto } from './dto/get-requests.dto';
import { RequestsService } from './requests.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    userType?: string;
  };
}

@ApiTags('requests')
@Controller('api/requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get()
  async getRequests(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetRequestsQueryDto
  ): Promise<GetRequestsResponseDto> {
    return this.requestsService.getRequests(query);
  }

  @Get('stats')
  async getRequestStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    reviewed: number;
    commented: number;
  }> {
    return this.requestsService.getRequestStats();
  }

  @Post(':id/status')
  async updateRequestStatus(
    @Param('id') requestId: string,
    @Body() body: {
      status: 'approved' | 'rejected' | 'reviewed' | 'commented';
      comment: string;
      reviewedBy: string;
    }
  ) {
    return this.requestsService.updateRequestStatus(
      requestId,
      body.status,
      body.comment,
      body.reviewedBy
    );
  }

  @Get('my-requests')
  @UseGuards(AuthGuard)
  async getMyRequests(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.requestsService.getRequestsForScholar(userId);
  }

  @Post()
  @UseGuards(AuthGuard)
  async createRequest(
    @Body() createRequestDto: CreateRequestDto,
    @Req() req: AuthenticatedRequest
  ): Promise<CreateRequestResponseDto> {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.requestsService.createRequest(createRequestDto, userId);
  }
}
