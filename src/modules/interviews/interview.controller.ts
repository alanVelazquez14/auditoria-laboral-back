import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { InterviewService } from './interview.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Post, Body } from '@nestjs/common';

@Controller('interviews')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Get('prepare/:jobId')
  @UseGuards(JwtAuthGuard)
  async prepareInterview(@Param('jobId') jobId: string, @Request() req) {
    return await this.interviewService.getPreparationContext(
      jobId,
      req.user.id,
    );
  }

  @Post('answer/:jobId')
  @UseGuards(JwtAuthGuard)
  async submitAnswer(
    @Param('jobId') jobId: string,
    @Body() body: { answer: string; history: any[] },
    @Request() req,
  ) {
    return await this.interviewService.processStep(
      jobId,
      req.user.id,
      body.answer,
      body.history,
    );
  }
}
