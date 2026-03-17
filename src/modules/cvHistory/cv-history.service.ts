import { Injectable } from '@nestjs/common';
import { CvHistory } from './cv-history.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CvHistoryService {
  constructor(
    @InjectRepository(CvHistory)
    private readonly cvRepository: Repository<CvHistory>,
  ) {}

  async createEntry(userId: string, cvUrl: string, analysis: any) {
    await this.cvRepository.update(
      { user: { id: userId }, isMain: true },
      { isMain: false },
    );

    const newEntry = this.cvRepository.create({
      cvUrl,
      analysis,
      isMain: true,
      user: { id: userId },
    });

    return await this.cvRepository.save(newEntry);
  }

  async getEvolutionData(userId: string) {
    const history = await this.cvRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'ASC' },
    });

    return history.map((entry) => ({
      date: entry.createdAt,
      score: entry.analysis.score,
      versionId: entry.id,
    }));
  }

  async getConversionStats(userId: string) {
    const history = await this.cvRepository.find({
      where: { user: { id: userId } },
      relations: ['applications'],
    });

    return history.map((cv) => {
      const total = cv.applications.length;
      const success = cv.applications.filter((app) =>
        ['entrevista', 'oferta'].includes(app.status),
      ).length;

      return {
        cvDate: cv.createdAt,
        score: cv.analysis.score,
        efficiency: total > 0 ? (success / total) * 100 : 0,
        totalApplied: total,
      };
    });
  }
}
