import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, AuthGuard],
})
export class UsersModule {}
