import { Controller, Get, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('cv-performance/:userId')
  async getCvPerformance(@Param('userId') userId: string) {
    return await this.analyticsService.getCvEfficiency(userId);
  }
}
