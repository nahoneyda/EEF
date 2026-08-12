import { Injectable } from '@nestjs/common';
import {
  ModuleExecutionJob,
  ModuleExecutionResult,
  ModuleExecutor,
} from '../../../../common/worker/module-executor.interface';
import { GenerateVideosUseCase } from '../use-cases/generate-videos.use-case';

@Injectable()
export class Ef11VideoGenerationExecutor extends ModuleExecutor {
  readonly moduleCode = 'EF-11';

  constructor(private readonly useCase: GenerateVideosUseCase) {
    super();
  }

  async execute(job: ModuleExecutionJob): Promise<ModuleExecutionResult> {
    const output = await this.useCase.execute({
      contentUuid: job.contentUuid,
      workflowRunId: job.workflowRunId,
      moduleRunId: job.moduleRunId,
      runMode:
        typeof job.inputPayload?.run_mode === 'string'
          ? job.inputPayload.run_mode
          : 'TEST',
    });

    return {
      moduleCode: this.moduleCode,
      status: 'SUCCEEDED',
      output: output as unknown as Record<string, unknown>,
    };
  }
}
