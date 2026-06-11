import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { EmailService } from '../email/email.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  controllers: [TasksController],
  providers: [TasksService, AuthGuard, EmailService],
  exports: [TasksService],
})
export class TasksModule {}
