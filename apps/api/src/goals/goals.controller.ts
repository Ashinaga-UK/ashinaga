import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalsService } from './goals.service';

@Controller('api/goals')
@UseGuards(AuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get('my-goals')
  async getMyGoals(@Request() req) {
    return this.goalsService.getGoalsByUser(req.user.id);
  }

  @Post()
  async createGoal(@Request() req, @Body() createGoalDto: CreateGoalDto) {
    return this.goalsService.createGoal(req.user.id, createGoalDto);
  }

  @Get(':id')
  async getGoal(@Request() req, @Param('id') id: string) {
    return this.goalsService.getGoalById(req.user.id, id);
  }

  @Patch(':id')
  async updateGoal(@Request() req, @Param('id') id: string, @Body() updateGoalDto: UpdateGoalDto) {
    return this.goalsService.updateGoal(req.user.id, id, updateGoalDto);
  }

  @Delete(':id')
  async deleteGoal(@Request() req, @Param('id') id: string) {
    return this.goalsService.deleteGoal(req.user.id, id);
  }
}
