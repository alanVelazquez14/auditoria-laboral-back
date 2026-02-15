import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobApplication } from './job-application.entity';
import { JobApplicationStatusHistory } from './job-application-status-history.entity';
import { UsersModule } from '../users/users.module';
import { JobApplicationsService } from './job-applications.service';
import { JobApplicationsController } from './job-application.controller';
import { JobOffersModule } from '../job-offers/job-offers.module';
import { JobOffer } from '../job-offers/job-offer.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobApplication,
      JobApplicationStatusHistory,
      User,
      JobOffer,
    ]),
    UsersModule,
    JobOffersModule,
  ],
  controllers: [JobApplicationsController],
  providers: [JobApplicationsService],
})
export class JobApplicationsModule {}
