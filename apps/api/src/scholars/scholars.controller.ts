import { Controller, Get, Param, ParseUUIDPipe, Query, ValidationPipe } from '@nestjs/common';
import {
  GetScholarsQueryDto,
  GetScholarsResponseDto,
  ScholarProfileDto,
  ScholarResponseDto,
} from './dto/get-scholars.dto';
import { ScholarsService } from './scholars.service';

@Controller('api/scholars')
export class ScholarsController {
  constructor(private readonly scholarsService: ScholarsService) {}

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

  @Get(':id/profile')
  async getScholarProfile(@Param('id', ParseUUIDPipe) id: string): Promise<ScholarProfileDto> {
    return this.scholarsService.getScholarProfile(id);
  }

  @Get(':id')
  async getScholar(@Param('id', ParseUUIDPipe) id: string): Promise<ScholarResponseDto> {
    return this.scholarsService.getScholar(id);
  }
}
