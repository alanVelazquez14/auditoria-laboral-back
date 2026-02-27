import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { Seniority } from '../common/enums/seniority.enum';
import { RoleCategory } from '../common/enums/role-category.enum';
import { CvType } from '../common/enums/cv-type.enum';
import { UserSkill } from '../user-skills/user-skill.entity';
import { Score } from '../scores/score.entity';
import { Diagnostic } from '../diagnostics/diagnostic.entity';
import { JobApplication } from '../job-applications/entities/job-application.entity';

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

  // --- Datos del Profile Wizard ---

  @Column({ type: 'date', nullable: true })
  birth?: Date;

  @Column({ type: 'enum', enum: Seniority, nullable: true })
  seniority?: Seniority;

  @Column({ type: 'int', default: 0 })
  yearsOfExperience: number; // Campo legacy (se llena vía compatibilidad)

  @Column({ nullable: true })
  yearsExperience?: string; // Campo nuevo (ej: "1-3", "5+")

  @Column({ nullable: true })
  location?: string;

  @Column({ type: 'enum', enum: RoleCategory, nullable: true })
  roleTarget?: RoleCategory;

  @Column({ nullable: true })
  targetRole?: string; // Para recibirlo directamente del DTO

  @Column({ type: 'enum', enum: CvType, nullable: true })
  cvType?: CvType;

  @Column({ nullable: true })
  cvUrl?: string;

  @Column({ nullable: true })
  isRoleOptimized?: string; // "complete" | "partial" | "no"

  @Column({ nullable: true })
  workPreference?: string; // "REMOTO" | "PRESENCIAL" | "HIBRIDO"

  @Column({ nullable: true })
  englishLevel?: string;

  @Column('simple-array', { nullable: true })
  stack?: string[];

  @Column({ nullable: true })
  stackYears?: string;

  @Column('simple-array', { nullable: true })
  stackExperienceType?: string[];

  @Column({ type: 'boolean', nullable: true })
  stackMatchesCV?: boolean;

  // Datos de Estrategia
  @Column({ nullable: true })
  recentApplications?: string;

  @Column({ nullable: true })
  interviews?: string;

  @Column({ nullable: true })
  recentRejections?: string;

  @Column('simple-array', { nullable: true })
  applicationType?: string[];

  // Redes Sociales (Guardado como JSON para facilitar la estructura)
  @Column({ type: 'json', nullable: true })
  portfolioLinks?: {
    portfolio: string;
    linkedin: string;
    github: string;
  };

  @Column({ type: 'boolean', default: false })
  consentToShareData: boolean;

  @Column({ type: 'text', nullable: true })
  additionalNotes?: string;

  // --- Estados y Relaciones ---

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

  // ... (Relaciones OneToMany se mantienen igual)
  @OneToMany(() => UserSkill, (userSkill) => userSkill.user)
  userSkills: UserSkill[];

  @OneToMany(() => JobApplication, (app) => app.user)
  applications: JobApplication[];

  @OneToMany(() => Diagnostic, (diagnostic) => diagnostic.user)
  diagnostics: Diagnostic[];

  @OneToMany(() => Score, (score) => score.user)
  scores: Score[];
}
