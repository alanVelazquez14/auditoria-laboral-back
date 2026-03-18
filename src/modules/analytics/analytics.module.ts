import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JobApplication } from "../job-applications/entities/job-application.entity";
import { CvHistory } from "../cvHistory/cv-history.entity";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsController } from "./analytics.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([JobApplication, CvHistory])
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}