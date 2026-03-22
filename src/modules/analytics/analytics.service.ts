import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CvPerformanceDto } from './dto/cv-performance.dto';
import { CvHistory } from 'src/modules/cvHistory/cv-history.entity';
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(CvHistory)
    private readonly cvRepo: Repository<CvHistory>,
  ) {}

  async getCvEfficiency(userId: string): Promise<CvPerformanceDto[]> {
    const rawStats = await this.cvRepo
      .createQueryBuilder('cv')
      .leftJoin('cv.applications', 'app')
      .where('cv.userId = :userId', { userId })
      .select([
        'cv.id AS "cvId"',
        `CAST(cv.analysis->>'score' AS INTEGER) AS "score"`,
        'cv.createdAt AS "date"',
        'cv."cvUrl" AS "cvUrl"',
        'COUNT(app.id) AS "total"',
        `COALESCE(SUM(CASE WHEN app.status IN ('INTERVIEW', 'HIRED') THEN 1 ELSE 0 END), 0) AS "successCount"`,
        `COALESCE(SUM(CASE WHEN app.status = 'REJECTED' THEN 1 ELSE 0 END), 0) AS "rejectedCount"`,
        'MAX(app.position) AS "position"',
      ])
      .groupBy('cv.id')
      .addGroupBy("cv.analysis->>'score'")
      .addGroupBy('cv.createdAt')
      .addGroupBy('cv."cvUrl"')
      .getRawMany();

    return rawStats.map((stat) => {
      const total = Number(stat.total);

      return {
        cvId: stat.cvId,
        score: Number(stat.score) || 0,
        versionDate: stat.date,
        cvUrl: stat.cvUrl,
        totalApplications: total,
        successRate: total > 0 ? (Number(stat.successCount) / total) * 100 : 0,
        rejectionRate:
          total > 0 ? (Number(stat.rejectedCount) / total) * 100 : 0,
        dominantPosition: stat.position || 'Perfil General',
      };
    });
  }
}
