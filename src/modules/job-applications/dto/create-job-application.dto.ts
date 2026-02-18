import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsUrl,
  IsNumber,
} from 'class-validator';
import { WorkMode } from '../../common/enums/work-mode.enum';
import { RoleCategory } from 'src/modules/common/enums/role-category.enum';

export class CreateJobApplicationDto {
  @IsString()
  companyName: string;

  @IsString()
  position: string;

  @IsOptional()
  @IsEnum(RoleCategory)
  roleCategory?: RoleCategory;

  @IsOptional()
  @IsEnum(WorkMode)
  mode?: WorkMode;

  @IsOptional()
  @IsUrl()
  jobUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  matchLevel?: number;

  @IsOptional()
  @IsString()
  message?: string;
}