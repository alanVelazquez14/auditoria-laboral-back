import {
  IsEnum,
  IsString,
  IsArray,
  IsOptional,
  ValidateNested,
  IsBoolean,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Seniority } from '../../common/enums/seniority.enum';
import { RoleCategory } from '../../common/enums/role-category.enum';
import { CvType } from '../../common/enums/cv-type.enum';

class PortfolioLinksDto {
  @IsOptional()
  @IsString()
  portfolio: string;

  @IsOptional()
  @IsString()
  linkedin: string;

  @IsOptional()
  @IsString()
  github: string;
}

export class UpdateProfileDto {
  @IsEnum(CvType)
  cvType: CvType;

  @IsUrl()
  cvUrl: string;

  @IsString()
  isRoleOptimized: 'complete' | 'partial' | 'no';

  // Step 2: Location & Preferences
  @IsString()
  location: string;

  @IsEnum(['REMOTO', 'PRESENCIAL', 'HIBRIDO'])
  workPreference: 'REMOTO' | 'PRESENCIAL' | 'HIBRIDO';

  @IsEnum(['Básico', 'Intermedio', 'Avanzado', 'Nativo'])
  englishLevel: 'Básico' | 'Intermedio' | 'Avanzado' | 'Nativo';

  // Step 3: Seniority & Role
  @IsEnum(RoleCategory)
  targetRole: RoleCategory;

  @IsEnum(Seniority)
  seniority: Seniority;

  @IsString()
  yearsExperience: string;

  // Step 4: Stack
  @IsArray()
  @IsString({ each: true })
  stack: string[];

  @IsString()
  stackYears: string;

  @IsArray()
  @IsString({ each: true })
  stackExperienceType: string[];

  @IsBoolean()
  @IsOptional()
  stackMatchesCV: boolean;

  // Step 5: Strategy
  @IsString()
  recentApplications: string;

  @IsString()
  interviews: string;

  @IsString()
  recentRejections: string;

  @IsArray()
  @IsString({ each: true })
  applicationType: string[];

  // Step 6: Networks
  @ValidateNested()
  @Type(() => PortfolioLinksDto)
  portfolioLinks: PortfolioLinksDto;

  // Step 7: Final
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  interests: string[];

  @IsBoolean()
  consentToShareData: boolean;

  @IsString()
  @IsOptional()
  additionalNotes: string;
}
