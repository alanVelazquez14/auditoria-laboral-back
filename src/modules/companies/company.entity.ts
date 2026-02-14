import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { JobOffer } from '../job-offers/job-offer.entity';

@Entity('companies')
@Index(['name'], { unique: true })
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ nullable: true })
  website?: string;

  @Column({ nullable: true })
  location?: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @OneToMany(() => JobOffer, (job) => job.company)
  jobOffers: JobOffer[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
