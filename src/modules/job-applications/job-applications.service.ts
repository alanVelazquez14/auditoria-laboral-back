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
import { JobStatus } from '../common/enums/job-status.enum';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';

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
  ) {}

  async create(userId: string, dto: CreateJobApplicationDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) throw new NotFoundException('User not found');
    if (!user.profileCompleted) {
      throw new ForbiddenException(
        'You must complete your profile before adding applications',
      );
    }

    // Verificación de duplicados usando los nombres de campo correctos
    const existing = await this.jobApplicationRepository.findOne({
      where: {
        user: { id: userId },
        companyName: dto.companyName,
        position: dto.position,
      },
    });

    if (existing)
      throw new ConflictException('You already registered this application');

    return await this.dataSource.transaction(async (manager) => {
      const newApplication = manager.create(JobApplication, {
        user: { id: userId },
        companyName: dto.companyName,
        position: dto.position,
        jobUrl: dto.jobUrl,
        status: JobStatus.APPLIED,
      });

      const savedApplication = await manager.save(newApplication);

      // Historial inicial
      const history = manager.create(JobApplicationStatusHistory, {
        application: { id: savedApplication.id },
        previousStatus: JobStatus.APPLIED,
        newStatus: JobStatus.APPLIED,
        changedBy: 'user',
        reason: 'initial',
      });

      await manager.save(history);
      return savedApplication;
    });
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
      relations: ['user', 'statusHistory'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  async getHistory(applicationId: string) {
    const exists = await this.jobApplicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!exists) {
      throw new NotFoundException('Application not found');
    }

    const history = await this.statusHistoryRepository.find({
      where: { application: { id: applicationId } },
      order: { changedAt: 'ASC' },
    });

    return history;
  }

  async seedTestData() {
    const users = await this.userRepository.find();

    const companies = [
      'Mercado Libre',
      'Globant',
      'Accenture',
      'Despegar',
      'Ualá',
      'PedidosYa',
    ];

    const positions = [
      'Backend Developer',
      'Frontend Developer',
      'Fullstack Developer',
      'Node.js Developer',
      'React Developer',
    ];

    for (const user of users) {
      for (let i = 0; i < 5; i++) {
        const companyName =
          companies[Math.floor(Math.random() * companies.length)];

        const position =
          positions[Math.floor(Math.random() * positions.length)];

        const exists = await this.jobApplicationRepository.findOne({
          where: {
            user: { id: user.id },
            companyName,
            position,
          },
        });

        if (exists) continue;

        const application = await this.dataSource.transaction(
          async (manager) => {
            const newApp = manager.create(JobApplication, {
              user: { id: user.id },
              companyName,
              position,
              status: JobStatus.APPLIED,
              matchLevel: Math.floor(Math.random() * 5) + 1,
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
