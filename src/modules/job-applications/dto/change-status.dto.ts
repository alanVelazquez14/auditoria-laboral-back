import { IsEnum } from 'class-validator';
import { JobStatus } from 'src/modules/common/enums/job-status.enum';

export class ChangeStatusDto {
  @IsEnum(JobStatus)
  status: JobStatus;
}