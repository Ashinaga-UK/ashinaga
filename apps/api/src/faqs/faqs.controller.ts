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
import { CreateFaqDto } from './dto/create-faq.dto';
import { GetFaqsQueryDto } from './dto/get-faqs.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { FaqsService } from './faqs.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    userType?: string;
  };
}

@ApiTags('faqs')
@Controller('api/faqs')
export class FaqsController {
  constructor(private readonly faqsService: FaqsService) {}

  @Get()
  @UseGuards(StaffGuard)
  async listFaqs(
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: GetFaqsQueryDto
  ) {
    return this.faqsService.listFaqs(query.audience);
  }

  @Post()
  @UseGuards(StaffGuard)
  async createFaq(
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: CreateFaqDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.faqsService.createFaq(dto, req.user?.id || '');
  }

  @Get('my-faqs')
  @UseGuards(AuthGuard)
  async getMyFaqs(@Req() req: AuthenticatedRequest) {
    return this.faqsService.getFaqsForScholar(req.user?.id || '');
  }

  @Patch(':id')
  @UseGuards(StaffGuard)
  async updateFaq(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateFaqDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.faqsService.updateFaq(id, dto, req.user?.id || '');
  }

  @Delete(':id')
  @UseGuards(StaffGuard)
  async deleteFaq(@Param('id', ParseUUIDPipe) id: string) {
    return this.faqsService.deleteFaq(id);
  }
}
