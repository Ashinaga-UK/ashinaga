import { Module } from '@nestjs/common';
import { AvatarsModule } from '../avatars/avatars.module';
import { DocumentsModule } from '../documents/documents.module';
import { InvitationsModule } from '../invitations/invitations.module';
import { ScholarsController } from './scholars.controller';
import { ScholarsService } from './scholars.service';

@Module({
  imports: [InvitationsModule, DocumentsModule, AvatarsModule],
  controllers: [ScholarsController],
  providers: [ScholarsService],
})
export class ScholarsModule {}
