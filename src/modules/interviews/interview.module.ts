import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { JobApplication } from '../job-applications/entities/job-application.entity';
import { CvHistory } from '../cvHistory/cv-history.entity';
import { AiModule } from 'src/ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([JobApplication, CvHistory]), AiModule],
  controllers: [InterviewController],
  providers: [InterviewService],
})
export class InterviewModule {}
