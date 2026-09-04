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
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { StaffGuard } from '../auth/staff.guard';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { CreateBulkTasksDto } from './dto/create-bulk-tasks.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { GetTaskCohortQueryDto } from './dto/get-task-cohort-query.dto';
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
  @UseGuards(StaffGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new task for a scholar' })
  async createTask(@Body() createTaskDto: CreateTaskDto, @Req() req: AuthenticatedRequest) {
    const assignedBy = req.user?.id;
    if (!assignedBy) {
      throw new Error('User not authenticated');
    }
    return this.tasksService.createTask(createTaskDto, assignedBy);
  }

  @Post('bulk')
  @UseGuards(StaffGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create the same task for multiple scholars at once' })
  async createBulkTasks(@Body() dto: CreateBulkTasksDto, @Req() req: AuthenticatedRequest) {
    const assignedBy = req.user?.id;
    if (!assignedBy) {
      throw new Error('User not authenticated');
    }
    return this.tasksService.createBulkTasks(dto, assignedBy);
  }

  @Get('suggestions')
  @UseGuards(StaffGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get title suggestions from previously assigned tasks' })
  async getTitleSuggestions(
    @Query('q') q: string | undefined,
    @Query('limit') limit: string | undefined,
    @Req() req: AuthenticatedRequest
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
  async getMyTasks(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.tasksService.getTasksByUser(userId);
  }

  @Get('cohort')
  @UseGuards(StaffGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Prep Year cohort task completion matrix' })
  async getCohort(
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: GetTaskCohortQueryDto
  ) {
    return this.tasksService.getCohort(query);
  }

  @Get('scholar/:scholarId')
  @UseGuards(StaffGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all tasks for a specific scholar' })
  async getTasksByScholar(@Param('scholarId') scholarId: string) {
    return this.tasksService.getTasksByScholar(scholarId);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update task status' })
  async updateTaskStatus(
    @Param('id') id: string,
    @Body('status') status: 'pending' | 'in_progress' | 'completed',
    @Req() req: AuthenticatedRequest
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.tasksService.updateTaskStatus(id, status, userId);
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
  @UseGuards(StaffGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a task' })
  async updateTask(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Req() req: AuthenticatedRequest
  ) {
    const actorId = req.user?.id;
    if (!actorId) {
      throw new Error('User not authenticated');
    }
    return this.tasksService.updateTask(id, updateTaskDto, actorId);
  }

  @Delete(':id')
  @UseGuards(StaffGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete (archive) a task' })
  async deleteTask(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const deletedBy = req.user?.id;
    if (!deletedBy) {
      throw new Error('User not authenticated');
    }
    return this.tasksService.softDeleteTask(id, deletedBy);
  }
}
