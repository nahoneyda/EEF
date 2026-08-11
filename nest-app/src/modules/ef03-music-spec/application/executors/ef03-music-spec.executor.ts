import { Injectable } from '@nestjs/common';

import {
  ModuleExecutionJob,
  ModuleExecutionResult,
  ModuleExecutor,
} from '../../../../common/worker/module-executor.interface';

import { GenerateMusicSpecUseCase } from '../use-cases/generate-music-spec.use-case';

@Injectable()
export class Ef03MusicSpecExecutor
  extends ModuleExecutor
{
  readonly moduleCode = 'EF-03';

  constructor(
    private readonly generateMusicSpec:
      GenerateMusicSpecUseCase,
  ) {
    super();
  }

  async execute(
    job: ModuleExecutionJob,
  ): Promise<ModuleExecutionResult> {
    const result =
      await this.generateMusicSpec.execute({
        contentUuid: job.contentUuid,
        workflowRunId: job.workflowRunId,
        moduleRunId: job.moduleRunId,
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
      moduleCode: this.moduleCode,
      status: 'SUCCEEDED',
      output: {
        contentUuid: result.contentUuid,
        workflowRunId: result.workflowRunId,
        moduleRunId: result.moduleRunId,
        musicSpecStatus:
          result.musicSpec.status,
        genre: result.musicSpec.genre,
        bpm: result.musicSpec.bpm,
        musicalKey:
          result.musicSpec.musicalKey,
      },
    };
  }

  private optionalString(
    value: unknown,
  ): string | undefined {
    return typeof value === 'string' && value.trim()
      ? value.trim()
      : undefined;
  }
}
