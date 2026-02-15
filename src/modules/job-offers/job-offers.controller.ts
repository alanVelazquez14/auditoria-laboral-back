import { Controller, Post, Body, Get } from '@nestjs/common';
import { CreateJobOfferDto } from './dto/create-job-offer.dto';
import { JobOffersService } from './job-offers.service';

@Controller('job-offers')
export class JobOffersController {
  constructor(private readonly jobOffersService: JobOffersService) {}

  @Post()
  create(@Body() dto: CreateJobOfferDto) {
    return this.jobOffersService.create(dto);
  }

  @Get()
  findAll() {
    return this.jobOffersService.findAll();
  }
}
