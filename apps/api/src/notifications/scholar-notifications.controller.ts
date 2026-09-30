import {
  Body,
  Controller,
  ForbiddenException,
  Get,
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
import {
  GetScholarFeedQueryDto,
  MarkScholarNotificationsReadDto,
  type ScholarFeedResponseDto,
} from './dto/scholar-notifications.dto';
import { NotificationsService } from './notifications.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    userType?: string;
  };
}

@ApiTags('notifications')
@Controller('api/notifications')
@UseGuards(AuthGuard)
export class ScholarNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('scholar-feed')
  async getScholarFeed(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetScholarFeedQueryDto,
    @Req() req: AuthenticatedRequest
  ): Promise<ScholarFeedResponseDto> {
    const userId = this.requireScholarUserId(req);
    return this.notificationsService.getScholarFeed(userId, query);
  }

  @Post('scholar-read')
  async markRead(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    body: MarkScholarNotificationsReadDto,
    @Req() req: AuthenticatedRequest
  ): Promise<{ updated: number }> {
    const userId = this.requireScholarUserId(req);
    return this.notificationsService.markScholarNotificationsRead(userId, body);
  }

  private requireScholarUserId(req: AuthenticatedRequest): string {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    if (req.user?.userType !== 'scholar') {
      throw new ForbiddenException('Access restricted to scholars only');
    }
    return userId;
  }
}
