import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobApplication } from './job-application.entity';
import { JobApplicationStatusHistory } from './job-application-status-history.entity';
import { User } from '../users/user.entity';
import { JobOffer } from '../job-offers/job-offer.entity';
import { JobStatus } from '../common/enums/job-status.enum';

@Injectable()
export class JobApplicationsService {
  constructor(
    @InjectRepository(JobApplication)
    private readonly jobApplicationRepository: Repository<JobApplication>,

    @InjectRepository(JobApplicationStatusHistory)
    private readonly statusHistoryRepository: Repository<JobApplicationStatusHistory>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(JobOffer)
    private readonly jobOfferRepository: Repository<JobOffer>,
  ) {}

  async create(userId: string, jobOfferId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.profileCompleted) {
      throw new ForbiddenException(
        'You must complete your profile before applying',
      );
    }

    const jobOffer = await this.jobOfferRepository.findOne({
      where: { id: jobOfferId },
    });

    if (!jobOffer) {
      throw new NotFoundException('Job offer not found');
    }

    const existingApplication = await this.jobApplicationRepository.findOne({
      where: {
        user: { id: userId },
        jobOffer: { id: jobOfferId },
      },
    });

    if (existingApplication) {
      throw new ConflictException('You already applied to this job');
    }

    const application = this.jobApplicationRepository.create({
      user,
      jobOffer,
      status: JobStatus.APPLIED,
    });

    await this.jobApplicationRepository.save(application);

    const history = this.statusHistoryRepository.create({
      application,
      status: JobStatus.APPLIED,
    });

    await this.statusHistoryRepository.save(history);

    return application;
  }

  async changeStatus(applicationId: string, newStatus: JobStatus) {
    const application = await this.jobApplicationRepository.findOne({
      where: { id: applicationId },
      relations: ['statusHistory'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (!this.isValidTransition(application.status, newStatus)) {
      throw new ForbiddenException(
        `Invalid status transition from ${application.status} to ${newStatus}`,
      );
    }

    application.status = newStatus;

    await this.jobApplicationRepository.save(application);

    const history = this.statusHistoryRepository.create({
      application,
      status: newStatus,
    });

    await this.statusHistoryRepository.save(history);

    return this.jobApplicationRepository.findOne({
      where: { id: applicationId },
      relations: ['statusHistory'],
    });
  }

  async findOne(id: string) {
    const application = await this.jobApplicationRepository.findOne({
      where: { id },
      relations: ['user', 'jobOffer', 'statusHistory'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  private isValidTransition(current: JobStatus, next: JobStatus): boolean {
    const transitions: Record<JobStatus, JobStatus[]> = {
      [JobStatus.APPLIED]: [JobStatus.REVIEWING, JobStatus.REJECTED],
      [JobStatus.REVIEWING]: [JobStatus.INTERVIEW, JobStatus.REJECTED],
      [JobStatus.INTERVIEW]: [JobStatus.HIRED, JobStatus.REJECTED],
      [JobStatus.REJECTED]: [],
      [JobStatus.HIRED]: [],
    };

    return transitions[current].includes(next);
  }
}
