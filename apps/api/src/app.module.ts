import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ScholarsModule } from './scholars/scholars.module';

@Module({
  imports: [AuthModule, ScholarsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
