import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { StorageModule } from '../storage/storage.module';
import { AvatarsController } from './avatars.controller';
import { AvatarsService } from './avatars.service';

@Module({
  imports: [StorageModule],
  controllers: [AvatarsController],
  providers: [AvatarsService, AuthGuard],
  exports: [AvatarsService],
})
export class AvatarsModule {}
