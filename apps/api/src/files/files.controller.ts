import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { FilesService } from './files.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    userType?: string;
  };
}

@ApiTags('files')
@Controller('api/files')
@UseGuards(AuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload-url')
  async getUploadUrl(
    @Body()
    body: {
      fileName: string;
      fileType: string;
      fileSize: number;
    },
    @Req() req: AuthenticatedRequest
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    return this.filesService.getUploadUrl(userId, body.fileName, body.fileType, body.fileSize);
  }

  @Post('confirm')
  async confirmUpload(
    @Body()
    body: {
      fileId: string;
      fileKey: string;
      requestId: string;
      fileName: string;
      fileSize: string;
      mimeType: string;
    },
    @Req() req: AuthenticatedRequest
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    return this.filesService.confirmUpload(
      userId,
      body.fileId,
      body.fileKey,
      body.requestId,
      body.fileName,
      body.fileSize,
      body.mimeType
    );
  }

  @Get('download/:id')
  async getDownloadUrl(@Param('id') attachmentId: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    return this.filesService.getDownloadUrl(userId, attachmentId);
  }

  @Delete(':id')
  async deleteFile(@Param('id') attachmentId: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    await this.filesService.deleteFile(userId, attachmentId);
    return { success: true };
  }
}
