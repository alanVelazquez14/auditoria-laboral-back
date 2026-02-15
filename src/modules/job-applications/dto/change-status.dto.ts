import { JobStatus } from 'src/modules/common/enums/job-status.enum';

export class ChangeStatusDto {
  status: JobStatus;
}
