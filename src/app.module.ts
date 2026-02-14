import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { JobApplicationsModule } from './modules/job-applications/job-applications.module';
import { DiagnosticsModule } from './modules/diagnostics/diagnostics.module';
import { ScoresModule } from './modules/scores/scores.module';
import { ActionsModule } from './modules/actions/actions.module';

@Module({
  imports: [UsersModule, JobApplicationsModule, DiagnosticsModule, ScoresModule, ActionsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
