import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { GetRequestsQueryDto, GetRequestsResponseDto } from './dto/get-requests.dto';
import { RequestsService } from './requests.service';

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
}
