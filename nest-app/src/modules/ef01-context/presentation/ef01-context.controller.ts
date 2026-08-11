import { Body, Controller, Post } from '@nestjs/common';

import { GenerateContextUseCase } from '../application/use-cases/generate-context.use-case';

import { RunEf01Dto } from '../application/dto/run-ef01.dto';

import { PreviewEf01Dto } from '../application/dto/preview-ef01.dto';

@Controller('api/ef01/context')
export class Ef01ContextController {
  constructor(private readonly generateContext: GenerateContextUseCase) {}

  @Post('preview')
  preview(
    @Body()
    dto: PreviewEf01Dto,
  ) {
    const source = dto.context ?? dto.inputPayload ?? {};

    const context = this.generateContext.preview(source);

    return {
      moduleCode: 'EF-01',

      mode: 'PREVIEW',

      context,
    };
  }

  @Post('run')
  async run(
    @Body()
    dto: RunEf01Dto,
  ) {
    const source = dto.context ?? dto.inputPayload ?? {};

    return this.generateContext.execute({
      contentUuid: dto.contentUuid,

      workflowRunId: dto.workflowRunId,

      moduleRunId: dto.moduleRunId,

      source,
    });
  }
}
