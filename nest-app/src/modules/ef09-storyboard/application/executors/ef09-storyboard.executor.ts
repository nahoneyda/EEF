import { Injectable } from '@nestjs/common';
import {
  ModuleExecutionJob,
  ModuleExecutionResult,
  ModuleExecutor,
} from '../../../../common/worker/module-executor.interface';
import { GenerateStoryboardUseCase } from '../use-cases/generate-storyboard.use-case';

@Injectable()
export class Ef09StoryboardExecutor extends ModuleExecutor {
  readonly moduleCode = 'EF-09';

  constructor(private readonly useCase: GenerateStoryboardUseCase) {
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

    return { moduleCode: this.moduleCode, status: 'SUCCEEDED', output };
  }
}
