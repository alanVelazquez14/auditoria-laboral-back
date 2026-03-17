import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsUrl,
  IsUUID,
} from 'class-validator';
import { WorkMode } from '../../common/enums/work-mode.enum';
import { RoleCategory } from 'src/modules/common/enums/role-category.enum';

export class CreateJobApplicationDto {
  @IsString()
  companyName: string;

  @IsEnum(RoleCategory)
  roleCategory: RoleCategory;

  @IsOptional()
  @IsEnum(WorkMode)
  mode?: WorkMode;

  @IsUrl(
    {
      require_protocol: true,
      require_tld: false,
    },
    { message: 'La URL no es válida' },
  )
  jobUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  matchLevel?: number;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  appliedCvId?: string;
}
