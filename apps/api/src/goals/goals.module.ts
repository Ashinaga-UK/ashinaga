import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';

@Module({
  imports: [EmailModule],
  controllers: [GoalsController],
  providers: [GoalsService],
})
export class GoalsModule {}
