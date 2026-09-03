import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AnnualUpdatesModule } from './annual-updates/annual-updates.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { EmailModule } from './email/email.module';
import { FilesModule } from './files/files.module';
import { GoalsModule } from './goals/goals.module';
import { HealthModule } from './health/health.module';
import { InvitationsModule } from './invitations/invitations.module';
import { RequestsModule } from './requests/requests.module';
import { ResourcesModule } from './resources/resources.module';
import { ScholarsModule } from './scholars/scholars.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HealthModule,
    EmailModule,
    AuthModule,
    ScholarsModule,
    RequestsModule,
    AnnouncementsModule,
    TasksModule,
    UsersModule,
    InvitationsModule,
    FilesModule,
    GoalsModule,
    ResourcesModule,
    DocumentsModule,
    AnnualUpdatesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
