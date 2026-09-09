import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { StaffGuard } from '../auth/staff.guard';
import {
  AttachProposalResourceDto,
  ProposalBodyDto,
  ReviewProposalStepDto,
} from './dto/proposals.dto';
import { ProposalsService } from './proposals.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    userType?: string;
  };
}

const bodyValidation = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

@ApiTags('proposals')
@Controller('api/proposals')
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  async getMine(@Req() req: AuthenticatedRequest) {
    return this.proposalsService.getMine(this.actorId(req));
  }

  @Post('me/steps/:stepKey/draft')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async saveDraft(
    @Param('stepKey') stepKey: string,
    @Body(bodyValidation) dto: ProposalBodyDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.proposalsService.saveDraft(this.actorId(req), stepKey, dto.body);
  }

  @Post('me/steps/:stepKey/submit')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async submit(
    @Param('stepKey') stepKey: string,
    @Body(bodyValidation) dto: ProposalBodyDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.proposalsService.submit(this.actorId(req), stepKey, dto.body);
  }

  @Post('me/steps/:stepKey/comments')
  @UseGuards(AuthGuard)
  async addScholarComment(
    @Param('stepKey') stepKey: string,
    @Body(bodyValidation) dto: ProposalBodyDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.proposalsService.addScholarComment(this.actorId(req), stepKey, dto.body);
  }

  @Get()
  @UseGuards(StaffGuard)
  async listInbox() {
    return this.proposalsService.listInbox();
  }

  @Post('steps/:stepKey/resources')
  @UseGuards(StaffGuard)
  async attachResource(
    @Param('stepKey') stepKey: string,
    @Body(bodyValidation) dto: AttachProposalResourceDto
  ) {
    return this.proposalsService.attachResource(stepKey, dto.resourceId);
  }

  @Get('scholars/:scholarId')
  @UseGuards(StaffGuard)
  async getForScholar(@Param('scholarId', ParseUUIDPipe) scholarId: string) {
    return this.proposalsService.getForScholar(scholarId);
  }

  @Post('scholars/:scholarId/steps/:stepKey/review')
  @HttpCode(HttpStatus.OK)
  @UseGuards(StaffGuard)
  async review(
    @Param('scholarId', ParseUUIDPipe) scholarId: string,
    @Param('stepKey') stepKey: string,
    @Body(bodyValidation) dto: ReviewProposalStepDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.proposalsService.review(
      scholarId,
      stepKey,
      this.actorId(req),
      dto.action,
      dto.comment
    );
  }

  @Post('scholars/:scholarId/steps/:stepKey/comments')
  @UseGuards(StaffGuard)
  async addStaffComment(
    @Param('scholarId', ParseUUIDPipe) scholarId: string,
    @Param('stepKey') stepKey: string,
    @Body(bodyValidation) dto: ProposalBodyDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.proposalsService.addStaffComment(scholarId, stepKey, this.actorId(req), dto.body);
  }

  private actorId(req: AuthenticatedRequest): string {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return userId;
  }
}
