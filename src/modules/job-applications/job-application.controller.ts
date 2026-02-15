import { Controller, Post, Param, Patch, Body, Get } from '@nestjs/common';
import { JobApplicationsService } from './job-applications.service';
import { ChangeStatusDto } from './dto/change-status.dto';

@Controller('job-applications')
export class JobApplicationsController {
  constructor(
    private readonly jobApplicationsService: JobApplicationsService,
  ) {}

  @Post(':userId/:jobOfferId')
  create(
    @Param('userId') userId: string,
    @Param('jobOfferId') jobOfferId: string,
  ) {
    return this.jobApplicationsService.create(userId, jobOfferId);
  }

  @Patch(':id/status')
  changeStatus(@Param('id') id: string, @Body() dto: ChangeStatusDto) {
    return this.jobApplicationsService.changeStatus(id, dto.status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobApplicationsService.findOne(id);
  }

  @Get(':id/history')
  async getHistory(@Param('id') id: string) {
    return this.jobApplicationsService.getHistory(id);
  }

  @Get('dev/seed')
  async seed() {
    return this.jobApplicationsService.seedTestData();
  }
}
