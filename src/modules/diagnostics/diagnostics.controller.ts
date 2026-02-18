import { Controller, Post, Param, Get } from '@nestjs/common';
import { DiagnosticsService } from './diagnostics.service';

@Controller('diagnostics')
export class DiagnosticsController {
  constructor(private readonly diagnosticsService: DiagnosticsService) {}

  @Post(':userId/profile')
  generateProfile(@Param('userId') userId: string) {
    return this.diagnosticsService.generateProfileDiagnostic(userId);
  }

  @Post(':userId/applications')
  generateApplications(@Param('userId') userId: string) {
    return this.diagnosticsService.generateApplicationsDiagnostic(userId);
  }

  @Get(':userId')
  getActive(@Param('userId') userId: string) {
    return this.diagnosticsService.getActiveDiagnostics(userId);
  }
}
