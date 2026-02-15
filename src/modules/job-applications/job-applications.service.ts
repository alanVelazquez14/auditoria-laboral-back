import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JobApplication } from './entities/job-application.entity';
import { JobApplicationStatusHistory } from './entities/job-application-status-history.entity';
import { User } from '../users/user.entity';
import { JobOffer } from '../job-offers/job-offer.entity';
import { JobStatus } from '../common/enums/job-status.enum';

@Injectable()
export class JobApplicationsService {
  constructor(
    private readonly dataSource: DataSource,
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

    const application = await this.dataSource.transaction(async (manager) => {
      const newApplication = manager.create(JobApplication, {
        user: { id: userId },
        jobOffer: { id: jobOfferId },
        status: JobStatus.APPLIED,
      });

      const savedApplication = await manager.save(newApplication);

      // Crear historial inicial profesional
      const history = manager.create(JobApplicationStatusHistory, {
        application: { id: savedApplication.id },
        previousStatus: JobStatus.APPLIED, // mismo que newStatus inicial
        newStatus: JobStatus.APPLIED,
        changedBy: 'system', // por ahora fijo
        reason: 'initial',
      });

      await manager.save(history);

      return savedApplication;
    });

    return application;
  }

  async changeStatus(applicationId: string, newStatus: JobStatus) {
    const application = await this.jobApplicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.status === newStatus) {
      throw new ForbiddenException('Status is already set');
    }

    if (!this.isValidTransition(application.status, newStatus)) {
      throw new ForbiddenException(
        `Invalid status transition from ${application.status} to ${newStatus}`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const previousStatus = application.status;

      await manager.update(
        JobApplication,
        { id: applicationId },
        { status: newStatus },
      );

      const history = manager.create(JobApplicationStatusHistory, {
        application: { id: applicationId },
        previousStatus,
        newStatus,
        changedBy: 'system',
      });

      await manager.save(history);
    });

    return this.findOne(applicationId);
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

  async getHistory(applicationId: string) {
    // Validar que la aplicación exista
    const exists = await this.jobApplicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!exists) {
      throw new NotFoundException('Application not found');
    }

    // Traer historial ordenado por fecha asc
    const history = await this.statusHistoryRepository.find({
      where: { application: { id: applicationId } },
      order: { changedAt: 'ASC' },
    });

    return history;
  }

  async seedTestData() {
    const users = await this.userRepository.find(); // todos los usuarios existentes
    const offers = await this.jobOfferRepository.find(); // todas las ofertas existentes

    for (const user of users) {
      for (const offer of offers) {
        const exists = await this.jobApplicationRepository.findOne({
          where: { user: { id: user.id }, jobOffer: { id: offer.id } },
        });
        if (exists) continue; // no duplicar

        // Crear aplicación con historial inicial
        const application = await this.dataSource.transaction(
          async (manager) => {
            const newApp = manager.create(JobApplication, {
              user: { id: user.id },
              jobOffer: { id: offer.id },
              status: JobStatus.APPLIED,
            });
            const savedApp = await manager.save(newApp);

            const history = manager.create(JobApplicationStatusHistory, {
              application: { id: savedApp.id },
              previousStatus: JobStatus.APPLIED,
              newStatus: JobStatus.APPLIED,
              changedBy: 'system',
              reason: 'initial',
            });
            await manager.save(history);

            return savedApp;
          },
        );

        // Opcional: Simular algunas transiciones aleatorias
        await this.simulateTransitions(application.id);
      }
    }

    return 'Seed completed';
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

  private async simulateTransitions(applicationId: string) {
    // Transiciones posibles
    const possibleTransitions: Record<JobStatus, JobStatus[]> = {
      [JobStatus.APPLIED]: [JobStatus.REVIEWING, JobStatus.REJECTED],
      [JobStatus.REVIEWING]: [JobStatus.INTERVIEW, JobStatus.REJECTED],
      [JobStatus.INTERVIEW]: [JobStatus.HIRED, JobStatus.REJECTED],
      [JobStatus.REJECTED]: [],
      [JobStatus.HIRED]: [],
    };

    let currentStatus = JobStatus.APPLIED;

    while (possibleTransitions[currentStatus].length > 0) {
      // Elegir transición aleatoria
      const options = possibleTransitions[currentStatus];
      const nextStatus = options[Math.floor(Math.random() * options.length)];

      await this.changeStatus(applicationId, nextStatus);

      currentStatus = nextStatus;
    }
  }
}
