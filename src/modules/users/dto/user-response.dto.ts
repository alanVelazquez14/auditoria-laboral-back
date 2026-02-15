import { Seniority } from '../../common/enums/seniority.enum';
import { RoleCategory } from '../../common/enums/role-category.enum';
import { CvType } from '../../common/enums/cv-type.enum';

export class UserResponseDto {
  id: string;
  fullName: string;
  email: string;
  birth?: Date;
  seniority?: Seniority;
  yearsOfExperience: number;
  location?: string;
  roleTarget?: RoleCategory;
  cvType?: CvType;
  cvUrl?: string;
  profileCompleted: boolean;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
