import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Diagnostic } from './entities/diagnostic.entity';
import { DiagnosticsService } from './diagnostics.service';
import { DiagnosticsController } from './diagnostics.controller';
import { User } from '../users/user.entity';
import { JobApplication } from '../job-applications/entities/job-application.entity';
import { Score } from '../scores/score.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Diagnostic, JobApplication, User, Score]),
  ],
  controllers: [DiagnosticsController],
  providers: [DiagnosticsService],
  exports: [DiagnosticsService],
})
export class DiagnosticsModule {}
