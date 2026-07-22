import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { StaffGuard } from '../auth/staff.guard';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourcesService } from './resources.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    userType?: string;
  };
}

@ApiTags('resources')
@Controller('api/resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  @UseGuards(StaffGuard)
  async listResources() {
    return this.resourcesService.listResources();
  }

  @Post()
  @UseGuards(StaffGuard)
  async createResource(
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: CreateResourceDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.resourcesService.createResource(dto, req.user?.id || '');
  }

  @Patch(':id')
  @UseGuards(StaffGuard)
  async updateResource(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateResourceDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.resourcesService.updateResource(id, dto, req.user?.id || '');
  }

  @Delete(':id')
  @UseGuards(StaffGuard)
  async archiveResource(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.resourcesService.archiveResource(id, req.user?.id || '');
  }

  @Get('filter-options')
  @UseGuards(StaffGuard)
  async getFilterOptions() {
    return this.resourcesService.getFilterOptions();
  }

  @Get('my-resources')
  @UseGuards(AuthGuard)
  async getMyResources(@Req() req: AuthenticatedRequest) {
    return this.resourcesService.getResourcesForScholar(req.user?.id || '');
  }
}
