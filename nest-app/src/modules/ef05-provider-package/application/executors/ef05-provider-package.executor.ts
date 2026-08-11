import { Injectable } from '@nestjs/common';
import {
  ModuleExecutionJob,
  ModuleExecutionResult,
  ModuleExecutor,
} from '../../../../common/worker/module-executor.interface';
import { GenerateProviderPackageUseCase } from '../use-cases/generate-provider-package.use-case';

@Injectable()
export class Ef05ProviderPackageExecutor extends ModuleExecutor {
  readonly moduleCode = 'EF-05';

  constructor(
    private readonly generateProviderPackage: GenerateProviderPackageUseCase,
  ) {
    super();
  }

  async execute(job: ModuleExecutionJob): Promise<ModuleExecutionResult> {
    const result = await this.generateProviderPackage.execute({
      contentUuid: job.contentUuid,
      workflowRunId: job.workflowRunId,
      moduleRunId: job.moduleRunId,
      runMode: this.optionalString(job.inputPayload?.run_mode) ?? 'TEST',
      expectedContentId: this.optionalString(job.inputPayload?.content_id),
    });

    return {
      moduleCode: this.moduleCode,
      status: 'SUCCEEDED',
      output: {
        contentUuid: result.contentUuid,
        workflowRunId: result.workflowRunId,
        moduleRunId: result.moduleRunId,
        packageStatus: result.providerPackage.packageStatus,
        provider: result.providerPackage.provider,
        providerModel: result.providerPackage.providerModel,
        packageVersion: result.providerPackage.packageVersion,
        outputAudioFormat: result.providerPackage.outputAudioFormat,
      },
    };
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }
}
