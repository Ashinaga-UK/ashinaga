import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { CreateBulkTasksDto } from './dto/create-bulk-tasks.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    userType?: string;
  };
}

@ApiTags('tasks')
@Controller('api/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new task for a scholar' })
  async createTask(@Body() createTaskDto: CreateTaskDto, @Req() req: AuthenticatedRequest) {
    // Get the current user ID from the authenticated user
    const assignedBy = req.user?.id;
    if (!assignedBy) {
      throw new Error('User not authenticated');
    }
    return this.tasksService.createTask(createTaskDto, assignedBy);
  }

  @Post('bulk')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create the same task for multiple scholars at once' })
  async createBulkTasks(@Body() dto: CreateBulkTasksDto, @Req() req: any) {
    const assignedBy = req.user?.id;
    if (!assignedBy) {
      throw new Error('User not authenticated');
    }
    return this.tasksService.createBulkTasks(dto, assignedBy);
  }

  @Get('suggestions')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get title suggestions from previously assigned tasks' })
  async getTitleSuggestions(
    @Query('q') q: string | undefined,
    @Query('limit') limit: string | undefined,
    @Req() req: any
  ) {
    const assignedBy = req.user?.id;
    if (!assignedBy) {
      throw new Error('User not authenticated');
    }
    const parsedLimit = Number.parseInt(limit ?? '', 10);
    return this.tasksService.getTitleSuggestions(
      q ?? '',
      assignedBy,
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 8
    );
  }

  @Get('my-tasks')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tasks for the authenticated scholar' })
  async getMyTasks(@Req() req: AuthenticatedRequest, @Query('includeArchived') includeArchived?: string) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.tasksService.getTasksByUser(userId, includeArchived === 'true');
  }

  @Get('scholar/:scholarId')
  @ApiOperation({ summary: 'Get all tasks for a specific scholar' })
  async getTasksByScholar(@Param('scholarId') scholarId: string, @Query('includeArchived') includeArchived?: string) {
    return this.tasksService.getTasksByScholar(scholarId, includeArchived === 'true');
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update task status' })
  async updateTaskStatus(
    @Param('id') id: string,
    @Body('status') status: 'pending' | 'in_progress' | 'completed'
  ) {
    return this.tasksService.updateTaskStatus(id, status);
  }

  @Post(':id/complete')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete a task with response and attachments' })
  async completeTask(
    @Param('id') id: string,
    @Body() completeTaskDto: CompleteTaskDto,
    @Req() req: AuthenticatedRequest
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.tasksService.completeTask(id, completeTaskDto, userId);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a task' })
  async updateTask(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.updateTask(id, updateTaskDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a task' })
  async archiveTask(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    return this.tasksService.archiveTask(id, userId);
  }

  @Patch(':id/restore')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore an archived task' })
  async restoreTask(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    return this.tasksService.restoreTask(id, userId);
  }
}
