import { Controller, Post, Param, Patch, Body, Get } from '@nestjs/common';
import { JobApplicationsService } from './job-applications.service';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';

@Controller('job-applications')
export class JobApplicationsController {
  constructor(
    private readonly jobApplicationsService: JobApplicationsService,
  ) {}
  @Get('dev/seed')
  async seed() {
    return this.jobApplicationsService.seedTestData();
  }

  @Get(':id/history')
  async getHistory(@Param('id') id: string) {
    return this.jobApplicationsService.getHistory(id);
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobApplicationsService.findOne(id);
  }

  @Post(':userId')
  create(
    @Param('userId') userId: string,
    @Body() dto: CreateJobApplicationDto,
  ) {
    return this.jobApplicationsService.create(userId, dto);
  }

  @Patch(':id/status')
  changeStatus(@Param('id') id: string, @Body() dto: ChangeStatusDto) {
    return this.jobApplicationsService.changeStatus(id, dto.status);
  }
}
