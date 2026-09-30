import {
  Body,
  Controller,
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
import { StaffGuard } from '../auth/staff.guard';
import {
  GetStaffFeedQueryDto,
  MarkStaffNotificationsReadDto,
  type StaffFeedResponseDto,
} from './dto/staff-notifications.dto';
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
@UseGuards(StaffGuard)
export class StaffNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('staff-feed')
  async getStaffFeed(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetStaffFeedQueryDto,
    @Req() req: AuthenticatedRequest
  ): Promise<StaffFeedResponseDto> {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.notificationsService.getStaffFeed(userId, query);
  }

  @Post('read')
  async markRead(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    body: MarkStaffNotificationsReadDto,
    @Req() req: AuthenticatedRequest
  ): Promise<{ updated: number }> {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.notificationsService.markStaffNotificationsRead(userId, body);
  }
}
