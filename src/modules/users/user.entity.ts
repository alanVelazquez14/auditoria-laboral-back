import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import { Seniority } from '../common/enums/seniority.enum';
import { RoleCategory } from '../common/enums/role-category.enum';
import { CvType } from '../common/enums/cv-type.enum';

@Entity('users')
@Entity('users')
@Index(['email'], { unique: true })
@Index(['roleTarget'])
@Index(['seniority'])
@Index(['profileCompleted'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ type: 'date', nullable: true })
  birth: Date;

  @Column({
    type: 'enum',
    enum: Seniority,
    nullable: true,
  })
  seniority: Seniority;

  @Column({ type: 'int', default: 0 })
  yearsOfExperience: number;

  @Column({ nullable: true })
  location: string;

  @Column({
    type: 'enum',
    enum: RoleCategory,
    nullable: true,
  })
  roleTarget: RoleCategory;

  @Column({
    type: 'enum',
    enum: CvType,
    nullable: true,
  })
  cvType: CvType;

  @Column({ nullable: true })
  cvUrl: string;

  @Column({ default: false })
  profileCompleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
