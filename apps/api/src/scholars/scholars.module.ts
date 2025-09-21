import { Module } from '@nestjs/common';
import { InvitationsModule } from '../invitations/invitations.module';
import { ScholarsController } from './scholars.controller';
import { ScholarsService } from './scholars.service';

@Module({
  imports: [InvitationsModule],
  controllers: [ScholarsController],
  providers: [ScholarsService],
})
export class ScholarsModule {}
