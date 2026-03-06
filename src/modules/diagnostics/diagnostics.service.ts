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
      apps.length,
    );
    await this.diagnosticRepo.save(diagnostics);

    return this.getDashboardSummary(userId);
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

    if (!lastScore) return 0;

    const prevAvg =
      (Number(lastScore.disciplineScore) + Number(lastScore.alignmentScore)) /
      2;
    const currAvg = (currentDisc + currentAlig) / 2;

    if (prevAvg === 0) return 0;

    // Retorna el porcentaje de cambio (ej: 105 si subió 5%, 90 si bajó 10%)
    return parseFloat((currAvg - prevAvg).toFixed(2));
  }

  private mapScoresToDiagnostics(
    userId: string,
    discipline: number,
    alignment: number,
    totalApps: number,
  ): Partial<Diagnostic>[] {
    const diagnostics: Partial<Diagnostic>[] = [];

    if (totalApps > 0 && discipline < 60) {
      diagnostics.push({
        user: { id: userId } as any,
        source: DiagnosticSource.BEHAVIORAL,
        issue: IssueType.LOW_DISCIPLINE,
        priority: DiagnosticPriority.HIGH,
        explanation: `Tu puntaje de disciplina es ${discipline}/100. Esto indica una frecuencia de postulación baja.`,
        recommendedAction:
          'Incrementar la frecuencia de postulaciones semanales.',
        notRecommendedAction: 'Postular de manera inconsistente.',
        active: true,
        engineVersion: this.ENGINE_VERSION,
      });
    }

    if (totalApps > 0 && alignment < 50) {
      diagnostics.push({
        user: { id: userId } as any,
        source: DiagnosticSource.BEHAVIORAL,
        issue: IssueType.LOW_MATCH,
        priority: DiagnosticPriority.MEDIUM,
        explanation: `Tu alineación es del ${alignment}%. Estás aplicando a vacantes que no coinciden con tu experiencia.`,
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
    //   await this.diagnosticRepo.delete({
    //     user: { id: userId },
    //     source,
    //   });
    // }
    await this.diagnosticRepo
      .createQueryBuilder()
      .delete()
      .from(Diagnostic)
      .where('userId = :userId', { userId })
      .andWhere('source = :source', { source })
      .execute();
  }

  async getActiveDiagnostics(userId: string) {
    return this.diagnosticRepo.find({
      where: { user: { id: userId }, active: true },
    });
  }

  async generateProfileDiagnostic(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['userSkills'],
    });

    if (!user) throw new Error('User not found');
    await this.deactivatePrevious(userId, DiagnosticSource.INITIAL);

    const diagnostics: Partial<Diagnostic>[] = [];
    const skillsCount = user.userSkills?.length || 0;

    if (!user.cvUrl) {
      diagnostics.push({
        user,
        source: DiagnosticSource.INITIAL,
        issue: IssueType.SENIORITY_MISMATCH,
        priority: DiagnosticPriority.HIGH,
        explanation: 'No se detectó un CV cargado en tu perfil.',
        recommendedAction: 'Subir CV actualizado',
        notRecommendedAction: 'Postular sin CV adjunto',
        active: true,
        engineVersion: this.ENGINE_VERSION,
      });
    }

    if (skillsCount < 3) {
      diagnostics.push({
        user,
        source: DiagnosticSource.INITIAL,
        issue: IssueType.LOW_MATCH,
        priority: DiagnosticPriority.MEDIUM,
        explanation: `Tus últimas postulaciones muestran una alineación baja con los requisitos técnicos. Estás aplicando a vacantes donde solo cumples con una fracción de lo solicitado.`,
        recommendedAction: 'Focaliza tus aplicaciones en vacantes donde tu Match sea superior al 70% o actualiza tu CV con las palabras clave que las empresas están buscando.',
        notRecommendedAction: 'Mantener un CV genérico para vacantes con requisitos muy específicos.',
        active: true,
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
        explanation: `Has realizado ${applications.length} postulaciones.
Para obtener métricas más representativas se recomienda al menos 5.`,
        recommendedAction: 'Aumentar frecuencia de postulación',
        notRecommendedAction: 'Postular esporádicamente',
        active: true,
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
        explanation: `El ${Math.round(
          (rejected / applications.length) * 100,
        )}% de tus postulaciones fueron rechazadas.`,
        recommendedAction: 'Revisar estrategia de postulación',
        notRecommendedAction: 'Seguir aplicando sin ajustar CV',
        active: true,
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
    const [lastScore, diagnostics, totalApps] = await Promise.all([
      this.scoreRepo.findOne({
        where: { user: { id: userId } },
        order: { calculatedAt: 'DESC' },
      }),
      this.getActiveDiagnostics(userId),
      this.jobAppRepo.count({
        where: { user: { id: userId } },
      }),
    ]);

    return {
      score: lastScore,
      diagnostics: diagnostics,
      totalApplications: totalApps,
      lastUpdate: lastScore?.calculatedAt || null,
    };
  }
}
