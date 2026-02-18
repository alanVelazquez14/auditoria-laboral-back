import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Diagnostic } from './diagnostic.entity';
import { DiagnosticsService } from './diagnostics.service';
import { DiagnosticsController } from './diagnostics.controller';
import { User } from '../users/user.entity';
import { JobApplication } from '../job-applications/entities/job-application.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Diagnostic, JobApplication, User]),
  ],
  controllers: [DiagnosticsController],
  providers: [DiagnosticsService],
})
export class DiagnosticsModule {}
