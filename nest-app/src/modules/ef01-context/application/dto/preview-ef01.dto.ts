import { IsObject, IsOptional } from 'class-validator';

export class PreviewEf01Dto {
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  inputPayload?: Record<string, unknown>;
}
