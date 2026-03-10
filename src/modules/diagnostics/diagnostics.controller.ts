import { Controller, Post, Get, Req, UseGuards } from '@nestjs/common';
import { DiagnosticsService } from './diagnostics.service';
import type { AuthRequest } from '../auth/interface/auth-request.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@UseGuards(JwtAuthGuard)
@Controller('diagnostics')
export class DiagnosticsController {
  constructor(private readonly diagnosticsService: DiagnosticsService) {}

  @Get('can-generate')
  async checkStatus(@Req() req: AuthRequest) {
    return {
      canGenerate: await this.diagnosticsService.canGenerate(req.user.id),
    };
  }

  @Get('scores')
  async getHistory(@Req() req: AuthRequest) {
    return this.diagnosticsService.getScoreHistory(req.user.id);
  }

  @Get('summary')
  async getSummary(@Req() req: AuthRequest) {
    return this.diagnosticsService.getDashboardSummary(req.user.id);
  }

  @Post('generate')
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  async runAnalysis(@Req() req: AuthRequest) {
    await this.diagnosticsService.generateProfileDiagnostic(req.user.id);
    return this.diagnosticsService.generateBehavioral(req.user.id);
  }
}
