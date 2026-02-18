import { DiagnosticPriority } from "src/modules/common/enums/diagnostic-priority.enum";
import { DiagnosticSource } from "src/modules/common/enums/diagnostic-source.enum";
import { IssueType } from "src/modules/common/enums/issue-type.enum";

export class DiagnosticItemDto {
  id: string;
  source: DiagnosticSource;
  issue: IssueType;
  priority: DiagnosticPriority;
  recommendedAction: string;
  notRecommendedAction: string;
  engineVersion: string;
  generatedAt: Date;
}

export class DiagnosticResponseDto {
  total: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  diagnostics: DiagnosticItemDto[];
}
