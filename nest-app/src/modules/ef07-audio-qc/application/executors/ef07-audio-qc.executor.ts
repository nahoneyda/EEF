import { Injectable } from '@nestjs/common';
import { ModuleExecutionJob, ModuleExecutionResult, ModuleExecutor } from '../../../../common/worker/module-executor.interface';
import { ReviewAudioUseCase } from '../use-cases/review-audio.use-case';

@Injectable()
export class Ef07AudioQcExecutor extends ModuleExecutor {
  readonly moduleCode = 'EF-07';
  constructor(private readonly useCase: ReviewAudioUseCase) { super(); }
  async execute(job: ModuleExecutionJob): Promise<ModuleExecutionResult> {
    const result = await this.useCase.execute({
      contentUuid: job.contentUuid,
      workflowRunId: job.workflowRunId,
      moduleRunId: job.moduleRunId,
      runMode: typeof job.inputPayload?.run_mode === 'string' ? job.inputPayload.run_mode : 'TEST',
    });
    return { moduleCode: this.moduleCode, status: 'SUCCEEDED', output: result };
  }
}
