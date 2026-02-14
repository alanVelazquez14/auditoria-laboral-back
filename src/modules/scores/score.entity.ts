import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('scores')
@Index(['user', 'calculatedAt'])
export class Score {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.scores, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  disciplineScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  alignmentScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  improvementScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  totalScore: number;

  @Column({ type: 'int' })
  totalApplicationsAtCalculation: number;

  @Column({ length: 20 })
  engineVersion: string;

  @CreateDateColumn()
  calculatedAt: Date;
}
