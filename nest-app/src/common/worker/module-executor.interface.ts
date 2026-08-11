export interface ModuleExecutionJob {
  moduleCode: string;

  contentUuid: string;

  workflowRunId: string;

  moduleRunId: string;

  inputPayload?: Record<string, unknown>;
}

export interface ModuleExecutionResult {
  moduleCode: string;

  status: 'SUCCEEDED' | 'FAILED';

  output?: Record<string, unknown>;
}

export abstract class ModuleExecutor {
  abstract readonly moduleCode: string;

  abstract execute(job: ModuleExecutionJob): Promise<ModuleExecutionResult>;
}
