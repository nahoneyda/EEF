import { Injectable } from '@nestjs/common';

import {
  ModuleExecutionJob,
  ModuleExecutionResult,
  ModuleExecutor,
} from '../../../../common/worker/module-executor.interface';

import { GenerateLyricsUseCase } from '../use-cases/generate-lyrics.use-case';

@Injectable()
export class Ef02LyricsExecutor
  extends ModuleExecutor
{
  readonly moduleCode = 'EF-02';

  constructor(
    private readonly generateLyrics:
      GenerateLyricsUseCase,
  ) {
    super();
  }

  async execute(
    job: ModuleExecutionJob,
  ): Promise<ModuleExecutionResult> {
    const result =
      await this.generateLyrics.execute({
        contentUuid:
          job.contentUuid,
        workflowRunId:
          job.workflowRunId,
        moduleRunId:
          job.moduleRunId,
        runMode:
          this.optionalString(
            job.inputPayload?.run_mode,
          ) ?? 'TEST',
        expectedContentId:
          this.optionalString(
            job.inputPayload?.content_id,
          ),
      });

    return {
      moduleCode:
        this.moduleCode,
      status:
        'SUCCEEDED',
      output: {
        contentUuid:
          result.contentUuid,
        workflowRunId:
          result.workflowRunId,
        moduleRunId:
          result.moduleRunId,
        lyricsStatus:
          result.lyrics.lyricsStatus,
        titleKo:
          result.lyrics.titleKo,
      },
    };
  }

  private optionalString(
    value: unknown,
  ): string | undefined {
    if (
      typeof value !== 'string' ||
      !value.trim()
    ) {
      return undefined;
    }

    return value.trim();
  }
}
