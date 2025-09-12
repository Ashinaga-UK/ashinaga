import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto, ResendInvitationDto } from './dto/create-invitation.dto';
import { StaffGuard } from '../auth/staff.guard';

@ApiTags('invitations')
@Controller('api/invitations')
@UseGuards(StaffGuard)
@ApiBearerAuth()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new invitation' })
  @ApiResponse({ status: 201, description: 'Invitation created successfully' })
  @ApiResponse({ status: 409, description: 'User already exists or invitation already active' })
  @ApiResponse({ status: 403, description: 'Access restricted to staff members' })
  async createInvitation(@Body() dto: CreateInvitationDto, @Req() req: any) {
    const invitedBy = req.user.id;
    return this.invitationsService.createInvitation(dto, invitedBy);
  }

  @Post('resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend an invitation email' })
  @ApiResponse({ status: 200, description: 'Invitation resent successfully' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  @ApiResponse({ status: 400, description: 'Cannot resend invitation' })
  async resendInvitation(@Body() dto: ResendInvitationDto, @Req() req: any) {
    const requestingUserId = req.user.id;
    return this.invitationsService.resendInvitation(dto.invitationId, requestingUserId);
  }

  @Get()
  @ApiOperation({ summary: 'List all invitations' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'accepted', 'expired', 'cancelled'],
    description: 'Filter invitations by status',
  })
  @ApiResponse({ status: 200, description: 'List of invitations' })
  async listInvitations(
    @Query('status') status?: 'pending' | 'accepted' | 'expired' | 'cancelled'
  ) {
    return this.invitationsService.listInvitations(status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending invitation' })
  @ApiResponse({ status: 200, description: 'Invitation cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  @ApiResponse({ status: 400, description: 'Cannot cancel invitation' })
  async cancelInvitation(@Param('id') id: string, @Req() req: any) {
    const cancelledBy = req.user.id;
    return this.invitationsService.cancelInvitation(id, cancelledBy);
  }
}
