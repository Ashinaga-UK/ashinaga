import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { StaffGuard } from '../auth/staff.guard';
import { CoordinatorNotesService } from './coordinator-notes.service';
import {
  CreateCoordinatorNoteDto,
  CreateMeetingUpdateDto,
  UpdateCoordinatorNoteDto,
  UpdateMeetingUpdateDto,
} from './dto/coordinator-notes.dto';

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

@ApiTags('coordinator-notes')
@Controller('api/scholars')
@UseGuards(StaffGuard)
export class CoordinatorNotesController {
  constructor(private readonly coordinatorNotesService: CoordinatorNotesService) {}

  @Get(':scholarId/coordinator-notes')
  async listNotes(@Param('scholarId', ParseUUIDPipe) scholarId: string) {
    return this.coordinatorNotesService.listNotes(scholarId);
  }

  @Post(':scholarId/coordinator-notes')
  async createNote(
    @Param('scholarId', ParseUUIDPipe) scholarId: string,
    @Body(bodyValidation) dto: CreateCoordinatorNoteDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.coordinatorNotesService.createNote(scholarId, this.actorId(req), dto);
  }

  @Patch(':scholarId/coordinator-notes/:noteId')
  async updateNote(
    @Param('scholarId', ParseUUIDPipe) scholarId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body(bodyValidation) dto: UpdateCoordinatorNoteDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.coordinatorNotesService.updateNote(scholarId, noteId, this.actorId(req), dto);
  }

  @Delete(':scholarId/coordinator-notes/:noteId')
  async deleteNote(
    @Param('scholarId', ParseUUIDPipe) scholarId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string
  ) {
    return this.coordinatorNotesService.deleteNote(scholarId, noteId);
  }

  @Get(':scholarId/meeting-updates')
  async listMeetings(@Param('scholarId', ParseUUIDPipe) scholarId: string) {
    return this.coordinatorNotesService.listMeetings(scholarId);
  }

  @Post(':scholarId/meeting-updates')
  async createMeeting(
    @Param('scholarId', ParseUUIDPipe) scholarId: string,
    @Body(bodyValidation) dto: CreateMeetingUpdateDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.coordinatorNotesService.createMeeting(scholarId, this.actorId(req), dto);
  }

  @Patch(':scholarId/meeting-updates/:updateId')
  async updateMeeting(
    @Param('scholarId', ParseUUIDPipe) scholarId: string,
    @Param('updateId', ParseUUIDPipe) updateId: string,
    @Body(bodyValidation) dto: UpdateMeetingUpdateDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.coordinatorNotesService.updateMeeting(scholarId, updateId, this.actorId(req), dto);
  }

  @Delete(':scholarId/meeting-updates/:updateId')
  async deleteMeeting(
    @Param('scholarId', ParseUUIDPipe) scholarId: string,
    @Param('updateId', ParseUUIDPipe) updateId: string
  ) {
    return this.coordinatorNotesService.deleteMeeting(scholarId, updateId);
  }

  private actorId(req: AuthenticatedRequest): string {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return userId;
  }
}
