import { Injectable } from '@nestjs/common';
import {
  ModuleExecutionJob,
  ModuleExecutionResult,
  ModuleExecutor,
} from '../../../../common/worker/module-executor.interface';
import { GenerateVideoConceptUseCase } from '../use-cases/generate-video-concept.use-case';

@Injectable()
export class Ef08VideoConceptExecutor extends ModuleExecutor {
  readonly moduleCode = 'EF-08';

  constructor(private readonly useCase: GenerateVideoConceptUseCase) {
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
