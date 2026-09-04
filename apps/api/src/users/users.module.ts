import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AvatarsModule } from '../avatars/avatars.module';
import { StaffGuard } from '../auth/staff.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AvatarsModule],
  controllers: [UsersController],
  providers: [UsersService, AuthGuard, StaffGuard],
})
export class UsersModule {}
