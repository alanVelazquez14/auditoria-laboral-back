import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsDateString,
  IsString,
  IsUrl,
} from 'class-validator';
import { Seniority } from '../../common/enums/seniority.enum';
import { RoleCategory } from '../../common/enums/role-category.enum';
import { CvType } from '../../common/enums/cv-type.enum';

export class UpdateProfileDto {
  @IsOptional()
  @IsDateString()
  birth?: Date;

  @IsOptional()
  @IsEnum(Seniority)
  seniority?: Seniority;

  @IsOptional()
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(RoleCategory)
  roleTarget?: RoleCategory;

  @IsOptional()
  @IsEnum(CvType)
  cvType?: CvType;

  @IsOptional()
  @IsUrl()
  cvUrl?: string;
}
