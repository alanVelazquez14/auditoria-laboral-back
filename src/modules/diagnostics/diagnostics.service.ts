import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Diagnostic } from './diagnostic.entity';
import { User } from '../users/user.entity';
import { DiagnosticSource } from '../common/enums/diagnostic-source.enum';
import { DiagnosticPriority } from '../common/enums/diagnostic-priority.enum';
import { IssueType } from '../common/enums/issue-type.enum';
import { JobApplication } from '../job-applications/entities/job-application.entity';

@Injectable()
export class DiagnosticsService {
  private readonly ENGINE_VERSION = '1.0.0';

  constructor(
    @InjectRepository(Diagnostic)
    private readonly diagnosticRepo: Repository<Diagnostic>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(JobApplication)
    private readonly jobAppRepo: Repository<JobApplication>,
  ) {}

  async generateProfileDiagnostic(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['skills'],
    });

    if (!user) throw new Error('User not found');

    await this.deactivatePrevious(userId, DiagnosticSource.INITIAL);

    const diagnostics: Partial<Diagnostic>[] = [];

    if (!user.cvUrl) {
      diagnostics.push({
        user,
        source: DiagnosticSource.INITIAL,
        issue: IssueType.SENIORITY_MISMATCH,
        priority: DiagnosticPriority.HIGH,
        recommendedAction: 'Subir CV actualizado',
        notRecommendedAction: 'Postular sin CV adjunto',
        engineVersion: this.ENGINE_VERSION,
      });
    }

    if (!user.userSkills || user.userSkills.length < 3) {
      diagnostics.push({
        user,
        source: DiagnosticSource.INITIAL,
        issue: IssueType.LOW_MATCH,
        priority: DiagnosticPriority.MEDIUM,
        recommendedAction: 'Agregar más habilidades relevantes',
        notRecommendedAction: 'Mantener perfil incompleto',
        engineVersion: this.ENGINE_VERSION,
      });
    }

    await this.diagnosticRepo.save(diagnostics);

    return this.getActiveDiagnostics(userId);
  }

  async generateApplicationsDiagnostic(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    await this.deactivatePrevious(userId, DiagnosticSource.BEHAVIORAL);

    const applications = await this.jobAppRepo.find({
      where: { user: { id: userId } },
    });

    const diagnostics: Partial<Diagnostic>[] = [];

    if (applications.length < 5) {
      diagnostics.push({
        user,
        source: DiagnosticSource.BEHAVIORAL,
        issue: IssueType.LOW_DISCIPLINE,
        priority: DiagnosticPriority.MEDIUM,
        recommendedAction: 'Aumentar frecuencia de postulación',
        notRecommendedAction: 'Postular esporádicamente',
        engineVersion: this.ENGINE_VERSION,
      });
    }

    const rejected = applications.filter((a) => a.status === 'REJECTED').length;

    if (applications.length > 0 && rejected / applications.length > 0.7) {
      diagnostics.push({
        user,
        source: DiagnosticSource.BEHAVIORAL,
        issue: IssueType.LOW_RESPONSE_RATE,
        priority: DiagnosticPriority.HIGH,
        recommendedAction: 'Revisar estrategia de postulación',
        notRecommendedAction: 'Seguir aplicando sin ajustar CV',
        engineVersion: this.ENGINE_VERSION,
      });
    }

    await this.diagnosticRepo.save(diagnostics);

    return this.getActiveDiagnostics(userId);
  }

  private async deactivatePrevious(userId: string, source: DiagnosticSource) {
    await this.diagnosticRepo.update(
      { user: { id: userId }, source, active: true },
      { active: false },
    );
  }

  async getActiveDiagnostics(userId: string) {
    const diagnostics = await this.diagnosticRepo.find({
      where: { user: { id: userId }, active: true },
    });

    return diagnostics;
  }
}
