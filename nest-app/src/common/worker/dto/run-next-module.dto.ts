import { IsNotEmpty, IsUUID } from 'class-validator';

export class RunNextModuleDto {
  @IsUUID()
  @IsNotEmpty()
  workflowRunId!: string;
}
