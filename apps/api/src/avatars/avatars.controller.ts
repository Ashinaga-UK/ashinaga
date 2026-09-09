import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthGuard } from '../auth/auth.guard';
import { isValidAvatarUserIdParam } from './avatar-files';
import { CreateAvatarUploadUrlDto } from './dto/create-avatar-upload-url.dto';
import { AvatarsService } from './avatars.service';

interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email?: string;
    userType?: string;
  };
}

@ApiTags('avatars')
@Controller('api/avatars')
export class AvatarsController {
  constructor(private readonly avatarsService: AvatarsService) {}

  @Post('upload-url')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get a presigned POST URL for an avatar JPEG upload' })
  async createUploadUrl(
    @Req() req: AuthenticatedRequest,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: CreateAvatarUploadUrlDto
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.avatarsService.createUploadUrl(userId, dto);
  }

  /**
   * Public (no AuthGuard): staff/scholar portals load avatars via cross-origin
   * `<img src="{API}/api/avatars/{userId}">`, so cookie auth cannot be required.
   * Only permanent S3 keys are signed; legacy data URLs are served inline.
   * External https avatars (dicebear) never hit this route — they stay as-is in JSON.
   */
  @Get(':userId')
  @ApiOperation({
    summary: 'Redirect to a signed avatar download (or serve legacy data URL)',
  })
  async getAvatar(@Param('userId') userId: string, @Res() res: FastifyReply) {
    if (!isValidAvatarUserIdParam(userId)) {
      throw new BadRequestException('Invalid user id');
    }

    const result = await this.avatarsService.getAvatarResponse(userId);
    if (result.kind === 'redirect') {
      return res
        .status(302)
        .header('Cache-Control', 'private, max-age=300')
        .redirect(result.url);
    }
    return res
      .type(result.contentType)
      .header('Cache-Control', 'private, max-age=300')
      .send(result.body);
  }
}
