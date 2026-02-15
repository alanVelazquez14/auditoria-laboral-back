import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  Column,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { JobOffer } from '../job-offers/job-offer.entity';
import { JobStatus } from '../common/enums/job-status.enum';
import { WorkMode } from '../common/enums/work-mode.enum';
import { JobApplicationStatusHistory } from './job-application-status-history.entity';

@Entity('job_applications')
@Index(['user', 'jobOffer'], { unique: true })
export class JobApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.applications, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => JobOffer, (offer) => offer.applications, {
    onDelete: 'CASCADE',
  })
  jobOffer: JobOffer;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.APPLIED,
  })
  status: JobStatus;

  @Column({ type: 'int', default: 1 })
  matchLevel: number; // 1-5 según tu arquitectura

  @Column({ type: 'enum', enum: WorkMode, nullable: true })
  mode: WorkMode;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  appliedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToMany(
    () => JobApplicationStatusHistory,
    (history) => history.application,
    { cascade: true },
  )
  statusHistory: JobApplicationStatusHistory[];
}
