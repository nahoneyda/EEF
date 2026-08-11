import { Injectable } from '@nestjs/common';
import { ModuleExecutionJob, ModuleExecutionResult, ModuleExecutor } from '../../../../common/worker/module-executor.interface';
import { GenerateAudioUseCase } from '../use-cases/generate-audio.use-case';

@Injectable()
export class Ef06AudioGenerationExecutor extends ModuleExecutor {
  readonly moduleCode='EF-06';
  constructor(private readonly useCase:GenerateAudioUseCase){super();}
  async execute(job:ModuleExecutionJob):Promise<ModuleExecutionResult>{
    const r=await this.useCase.execute({
      contentUuid:job.contentUuid,workflowRunId:job.workflowRunId,moduleRunId:job.moduleRunId,
      runMode:typeof job.inputPayload?.run_mode==='string'?job.inputPayload.run_mode:'TEST',
    });
    return {moduleCode:this.moduleCode,status:'SUCCEEDED',output:{
      contentUuid:r.contentUuid,workflowRunId:r.workflowRunId,moduleRunId:r.moduleRunId,
      jobId:r.jobId,generationId:r.generationId,provider:r.provider,providerModel:r.providerModel,
      audioStatus:'COMPLETED',storageBucket:r.storage.bucket,storagePath:r.storage.path,
      audioPublicUrl:r.storage.publicUrl??null,fileSizeBytes:r.storage.fileSizeBytes,
      generationTimeSeconds:r.generationTimeSeconds,
    }};
  }
}
