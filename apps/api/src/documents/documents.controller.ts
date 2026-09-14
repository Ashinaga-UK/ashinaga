import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { StaffGuard } from '../auth/staff.guard';
import { DocumentsService } from './documents.service';
import {
  ConfirmDocumentUploadDto,
  CreateDocumentUploadUrlDto,
  CreateRequiredDocumentTypeDto,
  DocumentDownloadQueryDto,
  GetCohortQueryDto,
  UpdateRequiredDocumentTypeDto,
} from './dto/documents.dto';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    userType?: string;
  };
}

@ApiTags('documents')
@Controller('api/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('types')
  @UseGuards(AuthGuard)
  async listTypes(@Req() req: AuthenticatedRequest) {
    return this.documentsService.listTypes(req.user?.userType);
  }

  @Post('types')
  @UseGuards(StaffGuard)
  async createType(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateRequiredDocumentTypeDto
  ) {
    return this.documentsService.createType(dto);
  }

  @Patch('types/:id')
  @UseGuards(StaffGuard)
  async updateType(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateRequiredDocumentTypeDto
  ) {
    return this.documentsService.updateType(id, dto);
  }

  @Post('upload-url')
  @UseGuards(AuthGuard)
  async createUploadUrl(
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: CreateDocumentUploadUrlDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.documentsService.createUploadUrl(req.user?.id || '', dto);
  }

  @Post()
  @UseGuards(AuthGuard)
  async confirmUpload(
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: ConfirmDocumentUploadDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.documentsService.confirmUpload(req.user?.id || '', dto);
  }

  @Get('my-checklist')
  @UseGuards(AuthGuard)
  async getMyChecklist(@Req() req: AuthenticatedRequest) {
    return this.documentsService.getMyChecklist(req.user?.id || '');
  }

  @Get('cohort')
  @UseGuards(StaffGuard)
  async getCohort(
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: GetCohortQueryDto
  ) {
    return this.documentsService.getCohort(query.missingTypeId);
  }

  @Get('scholar/:scholarId')
  @UseGuards(StaffGuard)
  async getScholarChecklist(@Param('scholarId', ParseUUIDPipe) scholarId: string) {
    return this.documentsService.getScholarChecklist(scholarId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteMyFile(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    return this.documentsService.deleteMyFile(req.user?.id || '', id);
  }

  @Get(':id/download')
  @UseGuards(AuthGuard)
  async getDownloadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: DocumentDownloadQueryDto
  ) {
    return this.documentsService.getDownloadUrl(
      id,
      req.user?.id || '',
      req.user?.userType,
      query.disposition ?? 'attachment'
    );
  }
}
