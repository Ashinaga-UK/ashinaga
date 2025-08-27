import { Module } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
  controllers: [RequestsController],
  providers: [RequestsService, EmailService],
})
export class RequestsModule {}
