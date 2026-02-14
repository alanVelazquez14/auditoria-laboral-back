import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

import { SkillLevel } from '../common/enums/skill-level.enum';
import { User } from '../users/user.entity';
import { Skill } from '../skills/skill.entity';

@Entity('user_skills')
@Index(['user', 'skill'], { unique: true })
export class UserSkill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.userSkills, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Skill, (skill) => skill.userSkills, { onDelete: 'CASCADE' })
  skill: Skill;

  @Column({
    type: 'enum',
    enum: SkillLevel,
    default: SkillLevel.BASIC,
  })
  level: SkillLevel;

  @Column({ type: 'int', default: 0 })
  yearsExperience: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
