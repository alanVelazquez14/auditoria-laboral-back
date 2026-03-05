import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Score } from './score.entity';
import { User } from '../users/user.entity';
import { JobApplication } from '../job-applications/entities/job-application.entity';

@Injectable()
export class ScoresService {
  constructor(
    @InjectRepository(Score)
    private scoreRepository: Repository<Score>,
  ) {}

  async calculateAndSave(
    user: User,
    applications: JobApplication[],
  ): Promise<Score> {
    // 1. Obtener el último score para calcular la mejoría
    const lastScore = await this.scoreRepository.findOne({
      where: { user: { id: user.id } },
      order: { calculatedAt: 'DESC' },
    });

    // 2. Cálculos de pilares
    const discipline = this.calculateDiscipline(applications);
    const alignment = this.calculateAlignment(applications);

    // El total es un promedio ponderado (40% disciplina, 60% match)
    const currentTotal = discipline * 0.4 + alignment * 0.6;

    // 3. Lógica de Mejora (improvementScore)
    // Es la diferencia entre el score actual y el anterior
    const improvement = lastScore
      ? currentTotal - Number(lastScore.totalScore)
      : 0;

    const newScore = this.scoreRepository.create({
      user,
      disciplineScore: discipline,
      alignmentScore: alignment,
      improvementScore: improvement,
      totalScore: currentTotal,
      totalApplicationsAtCalculation: applications.length,
      engineVersion: '1.1.0',
    });

    return await this.scoreRepository.save(newScore);
  }

  private calculateDiscipline(apps: JobApplication[]): number {
    if (apps.length === 0) return 0;

    // Lógica: Buscamos cuántas hubo en los últimos 7 días
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentApps = apps.filter(
      (app) => new Date(app.appliedAt) >= oneWeekAgo,
    );

    // Meta: 5 postulaciones por semana para el 100%
    return Math.min((recentApps.length / 5) * 100, 100);
  }

  private calculateAlignment(apps: JobApplication[]): number {
    if (apps.length === 0) return 0;

    // Promedio de los matchPercentage de todas las postulaciones
    const totalMatch = apps.reduce(
      (acc, app) => acc + Number(app.matchPercentage),
      0,
    );
    return totalMatch / apps.length;
  }
}
