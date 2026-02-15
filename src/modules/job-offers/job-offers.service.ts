import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobOffer } from './job-offer.entity';
import { Company } from '../companies/company.entity';
import { CreateJobOfferDto } from './dto/create-job-offer.dto';

@Injectable()
export class JobOffersService {
  constructor(
    @InjectRepository(JobOffer)
    private readonly jobOfferRepository: Repository<JobOffer>,

    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async create(dto: CreateJobOfferDto): Promise<JobOffer> {
    const jobOffer = this.jobOfferRepository.create({
      title: dto.title,
      description: dto.description,
      seniority: dto.seniority,
      roleCategory: dto.roleCategory,
      minYearsExperience: dto.minYearsExperience,
    });

    return this.jobOfferRepository.save(jobOffer);
  }

  async findAll(): Promise<JobOffer[]> {
    return this.jobOfferRepository.find({
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<JobOffer> {
    const jobOffer = await this.jobOfferRepository.findOne({
      where: { id },
      relations: ['company', 'applications'],
    });

    if (!jobOffer) {
      throw new NotFoundException('Job offer not found');
    }

    return jobOffer;
  }

  async remove(id: string): Promise<void> {
    const jobOffer = await this.findOne(id);
    await this.jobOfferRepository.softRemove(jobOffer);
  }
}
