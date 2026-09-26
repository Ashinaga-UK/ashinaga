import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { StaffGuard } from '../auth/staff.guard';
import { CreateRequestDto, CreateRequestResponseDto } from './dto/create-request.dto';
import { CreateStaffRequestDto } from './dto/create-staff-request.dto';
import { GetRequestsQueryDto, GetRequestsResponseDto } from './dto/get-requests.dto';
import { RespondToRequestDto } from './dto/respond-to-request.dto';
import {
  BulkUpdateRequestStatusDto,
  UpdateRequestStatusDto,
} from './dto/update-request-status.dto';
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
  @UseGuards(AuthGuard)
  async getRequests(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetRequestsQueryDto,
    @Req() req: AuthenticatedRequest
  ): Promise<GetRequestsResponseDto> {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.requestsService.getRequests(query, userId);
  }

  @Get('stats')
  @UseGuards(AuthGuard)
  async getRequestStats(@Req() req: AuthenticatedRequest): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    reviewed: number;
    commented: number;
  }> {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.requestsService.getRequestStats(userId);
  }

  @Post('bulk-status')
  @UseGuards(StaffGuard)
  async bulkUpdateRequestStatus(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    body: BulkUpdateRequestStatusDto,
    @Req() req: AuthenticatedRequest
  ) {
    const reviewedBy = req.user?.id;
    if (!reviewedBy) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.requestsService.bulkUpdateRequestStatus(body, reviewedBy);
  }

  @Post(':id/status')
  @UseGuards(StaffGuard)
  async updateRequestStatus(
    @Param('id') requestId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    body: UpdateRequestStatusDto,
    @Req() req: AuthenticatedRequest
  ) {
    const reviewedBy = req.user?.id;
    if (!reviewedBy) {
      throw new UnauthorizedException('User not authenticated');
    }
    // reviewedBy comes from the session, never the body — otherwise a caller
    // can attribute their own review to another staff member.
    return this.requestsService.updateRequestStatus(
      requestId,
      body.status,
      body.comment,
      reviewedBy
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

  @Post('staff')
  @UseGuards(StaffGuard)
  async createStaffRequest(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    createRequestDto: CreateStaffRequestDto,
    @Req() req: AuthenticatedRequest
  ): Promise<CreateRequestResponseDto> {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.requestsService.createStaffRequest(createRequestDto, userId);
  }

  @Post(':id/respond')
  @UseGuards(AuthGuard)
  async respondToRequest(
    @Param('id') requestId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) body: RespondToRequestDto,
    @Req() req: AuthenticatedRequest
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.requestsService.respondToCommentedRequest(
      requestId,
      userId,
      body.comment,
      body.attachmentIds ?? []
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async archiveRequest(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.requestsService.archiveRequest(id, userId);
  }
}
