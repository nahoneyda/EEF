import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class RunEf01Dto {
  @IsUUID()
  @IsNotEmpty()
  contentUuid!: string;

  @IsUUID()
  @IsNotEmpty()
  workflowRunId!: string;

  @IsUUID()
  @IsNotEmpty()
  moduleRunId!: string;

  @IsOptional()
  @IsString()
  contentId?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  inputPayload?: Record<string, unknown>;
}
