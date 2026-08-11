import { Injectable } from '@nestjs/common';

import {
  ModuleExecutionJob,
  ModuleExecutionResult,
  ModuleExecutor,
} from '../../../../common/worker/module-executor.interface';

import { GenerateCompositionPlanUseCase } from '../use-cases/generate-composition-plan.use-case';

@Injectable()
export class Ef04CompositionPlanExecutor
  extends ModuleExecutor
{
  readonly moduleCode = 'EF-04';

  constructor(
    private readonly generateCompositionPlan:
      GenerateCompositionPlanUseCase,
  ) {
    super();
  }

  async execute(
    job: ModuleExecutionJob,
  ): Promise<ModuleExecutionResult> {
    const result =
      await this.generateCompositionPlan.execute({
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
        compositionPlanStatus:
          result.compositionPlan.planStatus,
        titleKo:
          result.compositionPlan.titleKo,
        bpm:
          result.compositionPlan.bpm,
        musicalKey:
          result.compositionPlan.musicalKey,
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
