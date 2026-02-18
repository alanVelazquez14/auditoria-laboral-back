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
import { User } from '../../users/user.entity';
import { JobStatus } from '../../common/enums/job-status.enum';
import { WorkMode } from '../../common/enums/work-mode.enum';
import { JobApplicationStatusHistory } from './job-application-status-history.entity';
import { Company } from 'src/modules/companies/company.entity';

@Entity('job_applications')
@Index(['user', 'companyName', 'position'])
export class JobApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.applications, {
    onDelete: 'CASCADE',
  })
  user: User;

  @ManyToOne(() => Company, { nullable: true })
  company?: Company;

  @Column({ nullable: true })
  companyName: string;

  @Column()
  position: string;

  @Column({ nullable: true })
  jobUrl?: string;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.APPLIED,
  })
  status: JobStatus;

  @Column({ type: 'int', default: 1 })
  matchLevel: number; // 1-5

  @Column({ type: 'enum', enum: WorkMode, nullable: true })
  mode?: WorkMode;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  appliedAt: Date;

  @Column({ type: 'numeric', nullable: true })
  salaryExpected?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

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
