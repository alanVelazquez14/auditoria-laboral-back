import { Controller, Post, Param, Get } from '@nestjs/common';
import { DiagnosticsService } from './diagnostics.service';

@Controller('diagnostics')
export class DiagnosticsController {
  constructor(private readonly diagnosticsService: DiagnosticsService) {}

  @Get(':userId/can-generate')
  async checkStatus(@Param('userId') userId: string) {
    return { canGenerate: await this.diagnosticsService.canGenerate(userId) };
  }

  @Get(':userId/scores')
  async getHistory(@Param('userId') userId: string) {
    return this.diagnosticsService.getScoreHistory(userId);
  }

  @Get(':userId/summary')
  async getSummary(@Param('userId') userId: string) {
    return this.diagnosticsService.getDashboardSummary(userId);
  }

  @Post(':userId/generate')
  async runAnalysis(@Param('userId') userId: string) {
    return this.diagnosticsService.generateBehavioral(userId);
  }
}
