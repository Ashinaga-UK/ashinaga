import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { StaffGuard } from '../auth/staff.guard';
import { EmailService } from '../email/email.service';
import { StorageModule } from '../storage/storage.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [StorageModule],
  controllers: [TasksController],
  providers: [TasksService, AuthGuard, StaffGuard, EmailService],
  exports: [TasksService],
})
export class TasksModule {}
