import { Injectable, Logger } from '@nestjs/common';

import { WorkflowService } from '../workflow/workflow.service';

import { ExecutorRegistry } from './executor.registry';

import {
  ModuleExecutionJob,
  ModuleExecutionResult,
} from './module-executor.interface';

export interface RunNextResult {
  found: boolean;

  workflowRunId: string;

  moduleCode?: string;

  moduleRunId?: string;

  result?: ModuleExecutionResult;
}

@Injectable()
export class WorkerService {
  private readonly logger = new Logger(WorkerService.name);

  constructor(
    private readonly workflowService: WorkflowService,

    private readonly registry: ExecutorRegistry,
  ) {}

  /**
   * 이미 확보된 Job을 실행합니다.
   */
  async execute(job: ModuleExecutionJob): Promise<ModuleExecutionResult> {
    this.logger.log(
      [
        'Worker execute',
        `module=${job.moduleCode}`,
        `moduleRunId=${job.moduleRunId}`,
        `workflowRunId=${job.workflowRunId}`,
      ].join(' '),
    );

    const executor = this.registry.get(job.moduleCode);

    return executor.execute(job);
  }

  /**
   * Workflow에서 다음 QUEUED 모듈을 조회하고 실행합니다.
   */
  async runNext(workflowRunId: string): Promise<RunNextResult> {
    this.logger.log(`Finding next module: workflowRunId=${workflowRunId}`);

    const queued =
      await this.workflowService.getNextQueuedModule(workflowRunId);

    if (!queued) {
      return {
        found: false,
        workflowRunId,
      };
    }

    this.logger.log(
      [
        'Queued module found',
        `module=${queued.moduleCode}`,
        `moduleRunId=${queued.moduleRunId}`,
      ].join(' '),
    );

    const result = await this.execute({
      moduleCode: queued.moduleCode,

      contentUuid: queued.contentUuid,

      workflowRunId: queued.workflowRunId,

      moduleRunId: queued.moduleRunId,

      inputPayload: queued.inputPayload,
    });

    return {
      found: true,

      workflowRunId: queued.workflowRunId,

      moduleCode: queued.moduleCode,

      moduleRunId: queued.moduleRunId,

      result,
    };
  }
}
