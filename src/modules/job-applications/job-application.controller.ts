import { Controller, Post, Param, Patch, Body, Get } from '@nestjs/common';
import { JobApplicationsService } from './job-applications.service';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';

@Controller('job-applications')
export class JobApplicationsController {
  constructor(
    private readonly jobApplicationsService: JobApplicationsService,
  ) {}

  // Crear nueva postulación
  @Post(':userId')
  create(
    @Param('userId') userId: string,
    @Body() dto: CreateJobApplicationDto,
  ) {
    return this.jobApplicationsService.create(userId, dto);
  }

  // Cambiar estado
  @Patch(':id/status')
  changeStatus(@Param('id') id: string, @Body() dto: ChangeStatusDto) {
    return this.jobApplicationsService.changeStatus(id, dto.status);
  }

  // Traer una postulación
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobApplicationsService.findOne(id);
  }

  // Traer historial
  @Get(':id/history')
  async getHistory(@Param('id') id: string) {
    return this.jobApplicationsService.getHistory(id);
  }

  // Seed de desarrollo
  @Get('dev/seed')
  async seed() {
    return this.jobApplicationsService.seedTestData();
  }
}
