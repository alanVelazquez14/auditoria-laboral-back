import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsUrl,
} from 'class-validator';
import { WorkMode } from '../../common/enums/work-mode.enum';
import { RoleCategory } from 'src/modules/common/enums/role-category.enum';
import { Transform } from 'class-transformer';

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
  @Max(5)
  matchLevel?: number;

  @IsOptional()
  @IsString()
  message?: string;
}
