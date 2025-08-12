import { Controller, Get, Param, ParseUUIDPipe, Query, ValidationPipe } from '@nestjs/common';
import {
  GetScholarsQueryDto,
  GetScholarsResponseDto,
  ScholarResponseDto,
} from './dto/get-scholars.dto';
import { ScholarsService } from './scholars.service';

@Controller('scholars')
export class ScholarsController {
  constructor(private readonly scholarsService: ScholarsService) {}

  @Get()
  async getScholars(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetScholarsQueryDto
  ): Promise<GetScholarsResponseDto> {
    return this.scholarsService.getScholars(query);
  }

  @Get(':id')
  async getScholar(@Param('id', ParseUUIDPipe) id: string): Promise<ScholarResponseDto> {
    return this.scholarsService.getScholar(id);
  }
}
