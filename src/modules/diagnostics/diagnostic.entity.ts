import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { DiagnosticSource } from '../common/enums/diagnostic-source.enum';
import { IssueType } from '../common/enums/issue-type.enum';
import { DiagnosticPriority } from '../common/enums/diagnostic-priority.enum';

@Entity('diagnostics')
@Index(['user', 'active'])
export class Diagnostic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.diagnostics, { onDelete: 'CASCADE' })
  user: User;

  @Column({
    type: 'enum',
    enum: DiagnosticSource,
  })
  source: DiagnosticSource; // INITIAL | BEHAVIORAL

  @Column({
    type: 'enum',
    enum: IssueType,
  })
  issue: IssueType;

  @Column({
    type: 'enum',
    enum: DiagnosticPriority,
  })
  priority: DiagnosticPriority;

  @Column({ type: 'text' })
  recommendedAction: string;

  @Column({ type: 'text' })
  notRecommendedAction: string;

  @Column({ default: true })
  active: boolean;

  @Column({ length: 20 })
  engineVersion: string;

  @CreateDateColumn()
  generatedAt: Date;
}
