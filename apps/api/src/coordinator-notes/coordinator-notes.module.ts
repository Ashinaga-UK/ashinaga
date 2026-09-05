import { Module } from '@nestjs/common';
import { CoordinatorNotesController } from './coordinator-notes.controller';
import { CoordinatorNotesService } from './coordinator-notes.service';

@Module({
  controllers: [CoordinatorNotesController],
  providers: [CoordinatorNotesService],
})
export class CoordinatorNotesModule {}
