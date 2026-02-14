import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Company } from '../companies/company.entity';
import { Seniority } from '../common/enums/seniority.enum';
import { RoleCategory } from '../common/enums/role-category.enum';
import { JobApplication } from '../job-applications/job-application.entity';

@Entity('job_offers')
@Index(['roleCategory'])
@Index(['seniority'])
export class JobOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: Seniority,
  })
  seniority: Seniority;

  @Column({
    type: 'enum',
    enum: RoleCategory,
  })
  roleCategory: RoleCategory;

  @Column({ type: 'int', nullable: true })
  minYearsExperience?: number;

  @ManyToOne(() => Company, (company) => company.jobOffers, {
    onDelete: 'CASCADE',
  })
  company: Company;

  @OneToMany(() => JobApplication, (app) => app.jobOffer)
  applications: JobApplication[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
