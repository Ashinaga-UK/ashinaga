import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateTaskDto } from './dto/create-task.dto';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@Controller('api/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task for a scholar' })
  async createTask(@Body() createTaskDto: CreateTaskDto, @Req() req: any) {
    // Get the current user ID from the session
    // For now, we'll use a placeholder - this should come from the auth session
    const assignedBy = req.session?.userId || 'system';
    return this.tasksService.createTask(createTaskDto, assignedBy);
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
}
