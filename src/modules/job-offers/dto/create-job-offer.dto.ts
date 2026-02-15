import { IsString, IsEnum, IsOptional, IsInt } from 'class-validator';
import { Seniority } from '../../common/enums/seniority.enum';
import { RoleCategory } from '../../common/enums/role-category.enum';

export class CreateJobOfferDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(Seniority)
  seniority: Seniority;

  @IsEnum(RoleCategory)
  roleCategory: RoleCategory;

  @IsOptional()
  @IsInt()
  minYearsExperience?: number;
}
