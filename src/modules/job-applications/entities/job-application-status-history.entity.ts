import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { JobApplication } from './job-application.entity';
import { JobStatus } from '../../common/enums/job-status.enum';

@Entity('job_application_status_history')
export class JobApplicationStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => JobApplication, (application) => application.statusHistory, {
    onDelete: 'CASCADE',
  })
  application: JobApplication;

  @Column({
    type: 'enum',
    enum: JobStatus,
  })
  previousStatus: JobStatus;

  @Column({
    type: 'enum',
    enum: JobStatus,
  })
  newStatus: JobStatus;

  @Column({ nullable: true })
  changedBy?: string; // recruiterId o 'system'

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @CreateDateColumn()
  changedAt: Date;
}
