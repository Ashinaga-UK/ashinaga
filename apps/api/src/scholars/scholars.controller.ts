import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { StaffGuard } from '../auth/staff.guard';
import { CreateScholarDto } from './dto/create-scholar.dto';
import {
  GetScholarsQueryDto,
  GetScholarsResponseDto,
  ScholarProfileDto,
  ScholarResponseDto,
} from './dto/get-scholars.dto';
import { UpdateScholarProfileDto } from './dto/update-scholar-profile.dto';
import { ScholarsService } from './scholars.service';

@ApiTags('scholars')
@Controller('api/scholars')
export class ScholarsController {
  constructor(private readonly scholarsService: ScholarsService) {}

  @Post()
  @UseGuards(StaffGuard)
  async createScholar(
    @Body() createScholarDto: CreateScholarDto,
    @Request() req
  ): Promise<{ success: boolean; message: string; scholar?: any }> {
    return this.scholarsService.createScholar(createScholarDto, req.user.id);
  }

  @Get()
  async getScholars(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetScholarsQueryDto
  ): Promise<GetScholarsResponseDto> {
    return this.scholarsService.getScholars(query);
  }

  @Get('filters')
  async getFilterOptions(): Promise<{
    programs: string[];
    years: string[];
    universities: string[];
  }> {
    return this.scholarsService.getFilterOptions();
  }

  @Get('stats')
  async getScholarStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    onHold: number;
  }> {
    return this.scholarsService.getScholarStats();
  }

  // Scholar's own profile endpoints (must be before :id routes)
  @Get('my-profile')
  @UseGuards(AuthGuard)
  async getMyProfile(@Request() req): Promise<ScholarProfileDto> {
    return this.scholarsService.getScholarProfileByUserId(req.user.id);
  }

  @Patch('my-profile')
  @UseGuards(AuthGuard)
  async updateMyProfile(
    @Request() req,
    @Body() updateData: UpdateScholarProfileDto
  ): Promise<ScholarProfileDto> {
    return this.scholarsService.updateScholarProfile(req.user.id, updateData);
  }

  // Specific :id routes must come after all non-parameterized routes
  @Get(':id/profile')
  async getScholarProfile(@Param('id', ParseUUIDPipe) id: string): Promise<ScholarProfileDto> {
    return this.scholarsService.getScholarProfile(id);
  }

  @Get(':id')
  async getScholar(@Param('id', ParseUUIDPipe) id: string): Promise<ScholarResponseDto> {
    return this.scholarsService.getScholar(id);
  }
}
