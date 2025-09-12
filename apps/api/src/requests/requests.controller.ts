import { Body, Controller, Get, Param, Post, Query, ValidationPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetRequestsQueryDto, GetRequestsResponseDto } from './dto/get-requests.dto';
import { RequestsService } from './requests.service';

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
}
