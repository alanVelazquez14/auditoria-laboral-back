import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { CvHistoryService } from './cv-history.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('cv-history')
@UseGuards(JwtAuthGuard)
export class CvHistoryController {
  constructor(private readonly cvHistoryService: CvHistoryService) {}

  @Get('evolution')
  async getEvolution(@Request() req) {
    return await this.cvHistoryService.getEvolutionData(req.user.id);
  }

  @Get('conversion')
  async getConversion(@Request() req) {
    return await this.cvHistoryService.getConversionStats(req.user.id);
  }

  @Get('list')
  async getFullHistory(@Request() req) {
    return await this.cvHistoryService.getEvolutionData(req.user.id);
  }
}
