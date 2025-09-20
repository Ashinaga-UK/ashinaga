import { Body, Controller, Get, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@Controller('api/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new task for a scholar' })
  async createTask(@Body() createTaskDto: CreateTaskDto, @Req() req: any) {
    // Get the current user ID from the authenticated user
    const assignedBy = req.user?.id;
    if (!assignedBy) {
      throw new Error('User not authenticated');
    }
    return this.tasksService.createTask(createTaskDto, assignedBy);
  }

  @Get('my-tasks')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tasks for the authenticated scholar' })
  async getMyTasks(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.tasksService.getTasksByUser(userId);
  }

  @Get('scholar/:scholarId')
  @ApiOperation({ summary: 'Get all tasks for a specific scholar' })
  async getTasksByScholar(@Param('scholarId') scholarId: string) {
    return this.tasksService.getTasksByScholar(scholarId);
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
    @Req() req: any
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
}
