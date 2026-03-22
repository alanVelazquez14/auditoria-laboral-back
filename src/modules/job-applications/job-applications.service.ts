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
import { CvHistory } from '../cvHistory/cv-history.entity';
import { CvHistoryService } from '../cvHistory/cv-history.service';

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

    @InjectRepository(CvHistory)
    private readonly cvHistoryRepository: Repository<CvHistory>,

    @InjectRepository(CvHistory)
    private readonly cvRepository: Repository<CvHistory>,
    private readonly cvHistoryService: CvHistoryService,
  ) {}

  async create(userId: string, dto: CreateJobApplicationDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) throw new NotFoundException('User not found');
    if (!user.profileCompleted) {
      throw new ForbiddenException(
        'You must complete your profile before adding applications',
      );
    }

    let selectedCv;

    if (dto.appliedCvId) {
      selectedCv = await this.cvHistoryRepository.findOne({
        where: { id: dto.appliedCvId, user: { id: userId } },
      });
    } else {
      selectedCv = await this.cvHistoryRepository.findOne({
        where: { user: { id: userId }, isMain: true },
      });
    }

    const existing = await this.jobApplicationRepository.findOne({
      where: {
        user: { id: userId },
        companyName: dto.companyName,
        position: dto.roleCategory,
      },
    });

    if (existing)
      throw new ConflictException('You already registered this application');

    return await this.dataSource.transaction(async (manager) => {
      const newApplication = manager.create(JobApplication, {
        user: { id: userId },
        companyName: dto.companyName,
        position: dto.roleCategory,
        jobUrl: dto.jobUrl,
        status: JobStatus.APPLIED,
        mode: dto.mode,
        matchLevel: dto.matchLevel,
        notes: dto.message,
        cvVersion: selectedCv ?? undefined,
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

  async getHistory(userId: string) {
    const userExists = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!userExists) {
      throw new NotFoundException('User not found');
    }

    const applications = await this.jobApplicationRepository.find({
      where: { user: { id: userId } },
      relations: ['statusHistory', 'cvVersion'],
      order: { createdAt: 'DESC' },
    });

    return applications;
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
      const oldCv = await this.cvHistoryService.createEntry(
        user.id,
        'https://storage.com/cv-v1.pdf',
        { score: 45 },
      );
      await this.cvRepository.update(oldCv.id, { isMain: false }); // Ya no es el principal

      // Un CV nuevo con score alto
      const newCv = await this.cvHistoryService.createEntry(
        user.id,
        'https://storage.com/cv-v2-mejorado.pdf',
        { score: 85 },
      );

      for (let i = 0; i < 6; i++) {
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
        const cvToUse = i < 3 ? oldCv : newCv;

        const application = await this.dataSource.transaction(
          async (manager) => {
            const newApp = manager.create(JobApplication, {
              user: { id: user.id },
              companyName,
              position,
              status: JobStatus.APPLIED,
              matchLevel: i < 3 ? 2 : 5,

              cvVersion: cvToUse,
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

        if (cvToUse === newCv) {
          await this.changeStatus(application.id, JobStatus.REVIEWING);
          await this.changeStatus(application.id, JobStatus.INTERVIEW);
        } else {
          if (Math.random() > 0.5)
            await this.changeStatus(application.id, JobStatus.REJECTED);
        }
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
