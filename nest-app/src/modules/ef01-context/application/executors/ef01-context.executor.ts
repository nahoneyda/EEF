import { Injectable } from '@nestjs/common';

import {
  ModuleExecutionJob,
  ModuleExecutionResult,
  ModuleExecutor,
} from '../../../../common/worker/module-executor.interface';

import { GenerateContextUseCase } from '../use-cases/generate-context.use-case';

@Injectable()
export class Ef01ContextExecutor extends ModuleExecutor {
  readonly moduleCode = 'EF-01';

  constructor(private readonly generateContext: GenerateContextUseCase) {
    super();
  }

  async execute(job: ModuleExecutionJob): Promise<ModuleExecutionResult> {
    const result = await this.generateContext.execute({
      contentUuid: job.contentUuid,

      workflowRunId: job.workflowRunId,

      moduleRunId: job.moduleRunId,

      source: job.inputPayload ?? {},
    });

    return {
      moduleCode: this.moduleCode,

      status: 'SUCCEEDED',

      output: {
        contentUuid: result.contentUuid,

        workflowRunId: result.workflowRunId,

        moduleRunId: result.moduleRunId,

        contextStatus: result.context.contextStatus,
      },
    };
  }
}
