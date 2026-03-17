import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobApplication } from './entities/job-application.entity';
import { JobApplicationStatusHistory } from './entities/job-application-status-history.entity';
import { UsersModule } from '../users/users.module';
import { JobApplicationsService } from './job-applications.service';
import { JobApplicationsController } from './job-application.controller';
import { User } from '../users/user.entity';
import { CvHistory } from '../cvHistory/cv-history.entity';
import { CvHistoryModule } from '../cvHistory/cv-history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobApplication,
      JobApplicationStatusHistory,
      User,
      CvHistory,
    ]),
    UsersModule,
    CvHistoryModule,
  ],
  controllers: [JobApplicationsController],
  providers: [JobApplicationsService],
})
export class JobApplicationsModule {}
