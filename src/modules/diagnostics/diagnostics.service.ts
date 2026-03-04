import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Diagnostic } from './entities/diagnostic.entity';
import { User } from '../users/user.entity';
import { DiagnosticSource } from '../common/enums/diagnostic-source.enum';
import { DiagnosticPriority } from '../common/enums/diagnostic-priority.enum';
import { IssueType } from '../common/enums/issue-type.enum';
import { JobApplication } from '../job-applications/entities/job-application.entity';
import { Score } from '../scores/score.entity';

@Injectable()
export class DiagnosticsService {
  private readonly ENGINE_VERSION = '1.0.0';

  constructor(
    @InjectRepository(Diagnostic)
    private readonly diagnosticRepo: Repository<Diagnostic>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(JobApplication)
    private readonly jobAppRepo: Repository<JobApplication>,
    @InjectRepository(Score) private readonly scoreRepo: Repository<Score>,
  ) {}

  async canGenerate(userId: string): Promise<boolean> {
    const currentTotal = await this.jobAppRepo.count({
      where: { user: { id: userId } },
    });

    const lastScore = await this.scoreRepo.findOne({
      where: { user: { id: userId } },
      order: { calculatedAt: 'DESC' },
    });

    if (!lastScore) return currentTotal >= 5;

    const appsSinceLast =
      currentTotal - lastScore.totalApplicationsAtCalculation;
    return appsSinceLast >= 5;
  }

  async generateBehavioral(userId: string) {
    const canRun = await this.canGenerate(userId);
    if (!canRun)
      throw new BadRequestException(
        'Faltan postulaciones para un nuevo análisis',
      );

    const apps = await this.jobAppRepo.find({
      where: { user: { id: userId } },
    });

    await this.deactivatePrevious(userId, DiagnosticSource.BEHAVIORAL);

    const discipline = this.calculateDiscipline(apps);
    const alignment = this.calculateAlignment(apps);
    const improvement = await this.calculateImprovement(
      userId,
      discipline,
      alignment,
    );

    await this.scoreRepo.save({
      user: { id: userId } as any,
      disciplineScore: discipline,
      alignmentScore: alignment,
      improvementScore: improvement,
      totalScore: (discipline + alignment) / 2,
      totalApplicationsAtCalculation: apps.length,
      engineVersion: this.ENGINE_VERSION, // '1.0.0'
    });

    const diagnostics = this.mapScoresToDiagnostics(
      userId,
      discipline,
      alignment,
    );
    await this.diagnosticRepo.save(diagnostics);

    return this.getActiveDiagnostics(userId);
  }

  // --- LÓGICA DE CÁLCULO (MÉTODOS PRIVADOS) ---

  private calculateDiscipline(apps: JobApplication[]): number {
    if (apps.length === 0) return 0;
    // Mide constancia: puntos por cantidad total (placeholder de tu lógica)
    return Math.min(apps.length * 10, 100);
  }

  private calculateAlignment(apps: JobApplication[]): number {
    if (apps.length === 0) return 0;
    // Mide coherencia: puedes usar matchPercentage si lo tienes en la entidad
    const avgMatch =
      apps.reduce((acc, app) => acc + (app.matchPercentage || 0), 0) /
      apps.length;
    return avgMatch || 50; // 50 base si no hay datos de match
  }

  private async calculateImprovement(
    userId: string,
    currentDisc: number,
    currentAlig: number,
  ): Promise<number> {
    const lastScore = await this.scoreRepo.findOne({
      where: { user: { id: userId } },
      order: { calculatedAt: 'DESC' } as any,
    });

    if (!lastScore) return 100; // Primer análisis: 100% base

    const prevAvg =
      (Number(lastScore.disciplineScore) + Number(lastScore.alignmentScore)) /
      2;
    const currAvg = (currentDisc + currentAlig) / 2;

    if (prevAvg === 0) return 100;

    // Retorna el porcentaje de cambio (ej: 105 si subió 5%, 90 si bajó 10%)
    return parseFloat(((currAvg / prevAvg) * 100).toFixed(2));
  }

  private mapScoresToDiagnostics(
    userId: string,
    discipline: number,
    alignment: number,
  ): Partial<Diagnostic>[] {
    const diagnostics: Partial<Diagnostic>[] = [];

    if (discipline < 60) {
      diagnostics.push({
        user: { id: userId } as any,
        source: DiagnosticSource.BEHAVIORAL,
        issue: IssueType.LOW_DISCIPLINE,
        priority: DiagnosticPriority.HIGH,
        recommendedAction:
          'Incrementar la frecuencia de postulaciones semanales.',
        notRecommendedAction: 'Postular de manera inconsistente.',
        active: true,
        engineVersion: this.ENGINE_VERSION,
      });
    }

    if (alignment < 50) {
      diagnostics.push({
        user: { id: userId } as any,
        source: DiagnosticSource.BEHAVIORAL,
        issue: IssueType.LOW_MATCH,
        priority: DiagnosticPriority.MEDIUM,
        recommendedAction: 'Alinear las búsquedas con tu perfil y seniority.',
        notRecommendedAction:
          'Aplicar a roles que no coinciden con tu experiencia.',
        active: true,
        engineVersion: this.ENGINE_VERSION,
      });
    }

    return diagnostics;
  }

  private async deactivatePrevious(userId: string, source: DiagnosticSource) {
    await this.diagnosticRepo.update(
      { user: { id: userId }, source, active: true },
      { active: false },
    );
  }

  async getActiveDiagnostics(userId: string) {
    return this.diagnosticRepo.find({
      where: { user: { id: userId }, active: true },
    });
  }

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

  async getScoreHistory(userId: string) {
    return this.scoreRepo.find({
      where: { user: { id: userId } },
      order: { calculatedAt: 'ASC' },
    });
  }

  async getDashboardSummary(userId: string) {
    const [lastScore, diagnostics] = await Promise.all([
      this.scoreRepo.findOne({
        where: { user: { id: userId } },
        order: { calculatedAt: 'DESC' },
      }),
      this.getActiveDiagnostics(userId),
    ]);

    return {
      score: lastScore,
      diagnostics: diagnostics,
      lastUpdate: lastScore?.calculatedAt || null,
    };
  }
}
