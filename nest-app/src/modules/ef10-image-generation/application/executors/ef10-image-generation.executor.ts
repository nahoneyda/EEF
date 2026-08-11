import { Injectable } from '@nestjs/common';
import {
  ModuleExecutionJob,
  ModuleExecutionResult,
  ModuleExecutor,
} from '../../../../common/worker/module-executor.interface';
import { GenerateImagesUseCase } from '../use-cases/generate-images.use-case';

@Injectable()
export class Ef10ImageGenerationExecutor extends ModuleExecutor {
  readonly moduleCode = 'EF-10';

  constructor(private readonly useCase: GenerateImagesUseCase) {
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
