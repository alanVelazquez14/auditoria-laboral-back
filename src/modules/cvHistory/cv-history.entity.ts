import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { JobApplication } from '../job-applications/entities/job-application.entity';

@Entity('cv_history')
export class CvHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  cvUrl: string;

  @Column({ type: 'jsonb' })
  analysis: any;

  @Column({ default: false })
  isMain: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.cvHistory)
  user: User;

  @OneToMany(() => JobApplication, (app) => app.cvVersion)
  applications: JobApplication[];
}
