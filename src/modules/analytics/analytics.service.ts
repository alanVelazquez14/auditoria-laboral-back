import { Injectable } from '@nestjs/common';
import { JobApplication } from '../job-applications/entities/job-application.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CvPerformanceDto } from './dto/cv-performance.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(JobApplication)
    private readonly jobAppRepo: Repository<JobApplication>,
  ) {}

  async getCvEfficiency(userId: string): Promise<CvPerformanceDto[]> {
    const rawStats = await this.jobAppRepo
      .createQueryBuilder('app')
      .leftJoin('app.cvVersion', 'cv')
      .where('app.userId = :userId', { userId })
      .andWhere('app.cvVersionId IS NOT NULL')
      .select([
        'cv.id AS "cvId"',
        'CAST(cv.analysis->>\'score\' AS INTEGER) AS "score"',
        'cv.createdAt AS "date"',
        'COUNT(app.id) AS "total"',
        `SUM(CASE WHEN app.status IN ('INTERVIEW', 'HIRED') THEN 1 ELSE 0 END) AS "successCount"`,
        `SUM(CASE WHEN app.status = 'REJECTED' THEN 1 ELSE 0 END) AS "rejectedCount"`,
        'app.position AS "position"',
      ])
      .groupBy('cv.id')
      .addGroupBy('app.position')
      .getRawMany();

    return rawStats.map((stat) => ({
      cvId: stat.cvId,
      score: Number(stat.score),
      versionDate: stat.date,
      totalApplications: Number(stat.total),
      successRate: (Number(stat.successCount) / Number(stat.total)) * 100,
      rejectionRate: (Number(stat.rejectedCount) / Number(stat.total)) * 100,
      dominantPosition: stat.position,
    }));
  }
}
