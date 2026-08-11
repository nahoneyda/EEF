import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRunService } from '../../../../common/workflow/module-run/module-run.service';
import { EventBusService } from '../../../../common/events/event-bus.service';
import { AudioGeneratedEvent } from '../../../../common/events/events/audio-generated.event';
import { AudioGenerationRepository } from '../../domain/repositories/audio-generation.repository';
import { AudioProvider } from '../../domain/services/audio-provider.service';
import { AudioStorage } from '../../domain/services/audio-storage.service';
import { AudioGenerationResult, AudioJobType } from '../../domain/entities/audio-generation.entity';

@Injectable()
export class GenerateAudioUseCase {
  constructor(
    private readonly repo: AudioGenerationRepository,
    private readonly provider: AudioProvider,
    private readonly storage: AudioStorage,
    private readonly moduleRun: ModuleRunService,
    private readonly events: EventBusService,
    private readonly config: ConfigService,
  ) {}

  async execute(req:{contentUuid:string;workflowRunId:string;moduleRunId:string;runMode?:string;}):Promise<AudioGenerationResult>{
    await this.moduleRun.beginModule(req.moduleRunId);
    let jobId:string|undefined, generationId:string|undefined;
    try{
      const pkg=await this.repo.getProviderPackage(req.contentUuid);
      const runMode=(req.runMode??'TEST').trim().toUpperCase();
      const prod=runMode==='PRODUCTION';
      const model=this.config.get<string>(prod?'LYRIA_MODEL_PRODUCTION':'LYRIA_MODEL_TEST')??(prod?'lyria-3-pro-preview':'lyria-3-clip-preview');
      const jobType=(this.config.get<string>(prod?'EF06_PRODUCTION_JOB_TYPE':'EF06_TEST_JOB_TYPE')??(prod?'PRO':'CLIP')) as AudioJobType;
      const maxAttempts=Number(this.config.get<string>('EF06_MAX_ATTEMPTS')??'3');
      const bucket=this.config.get<string>('EF06_AUDIO_BUCKET')??'ai-music';
      const requestPayload={
        model,input:pkg.providerPrompt,response_format:{type:'audio'},
        run_mode:runMode,ef05_package_id:pkg.id,ef05_package_version:pkg.packageVersion,
        intended_duration_sec:pkg.generationParameters['durationSec']??null,
        test_preview:!prod,
      };
      const job=await this.repo.createJob({
        projectId:pkg.projectId,projectCode:pkg.projectCode,contentUuid:req.contentUuid,
        workflowRunId:req.workflowRunId,moduleRunId:req.moduleRunId,compositionPackageId:pkg.id,
        jobType,provider:this.provider.provider,providerModel:model,inputPrompt:pkg.providerPrompt,
        requestPayload,maxAttempts,storageBucket:bucket,
      }); jobId=job.jobId;
      const gen=await this.repo.createGeneration({
        projectId:pkg.projectId,projectCode:pkg.projectCode,contentUuid:req.contentUuid,
        workflowRunId:req.workflowRunId,moduleRunId:req.moduleRunId,compositionPackageId:pkg.id,
        provider:this.provider.provider,providerModel:model,requestPayload,
      }); generationId=gen.id;

      await this.repo.updateJobStatus(jobId,'PROCESSING');
      await this.repo.updateGenerationStatus(generationId,'SENT','GENERATING');

      const produced=await this.provider.generate({model,prompt:pkg.providerPrompt,outputFormat:pkg.outputAudioFormat});
      await this.repo.updateJobStatus(jobId,'GENERATED');
      await this.repo.updateGenerationStatus(generationId,'ACCEPTED','GENERATED',{
        provider_generation_id:produced.providerGenerationId??null,
        provider_response:produced.rawMetadata,
        generation_time_seconds:produced.generationTimeSeconds,
        generated_at:new Date().toISOString(),
      });

      await this.repo.updateJobStatus(jobId,'UPLOADING');
      await this.repo.updateGenerationStatus(generationId,'ACCEPTED','UPLOADING');
      const stored=await this.storage.store({
        projectCode:pkg.projectCode,contentUuid:req.contentUuid,moduleRunId:req.moduleRunId,
        audio:produced.audio,mimeType:produced.mimeType,extension:produced.extension,
      });

      await this.repo.completeJob(jobId,stored,produced.providerGenerationId);
      await this.repo.completeGeneration(generationId,produced,stored);

      await this.moduleRun.finishModule(req.moduleRunId,true,{
        module_code:'EF-06',content_uuid:req.contentUuid,workflow_run_id:req.workflowRunId,
        module_run_id:req.moduleRunId,audio_status:'COMPLETED',job_id:jobId,generation_id:generationId,
        provider:produced.provider,provider_model:produced.model,storage_bucket:stored.bucket,
        storage_path:stored.path,audio_public_url:stored.publicUrl??null,
        file_size_bytes:stored.fileSizeBytes,generation_time_seconds:produced.generationTimeSeconds,
        run_mode:runMode,
      },null,null);

      await this.events.publish(new AudioGeneratedEvent(req.workflowRunId,req.moduleRunId,req.contentUuid,{
        status:'COMPLETED',provider:produced.provider,providerModel:produced.model,
        generationId,jobId,storageBucket:stored.bucket,storagePath:stored.path,
        audioPublicUrl:stored.publicUrl,fileSizeBytes:stored.fileSizeBytes,
      }));

      return {
        generationId,jobId,contentUuid:req.contentUuid,workflowRunId:req.workflowRunId,
        moduleRunId:req.moduleRunId,provider:produced.provider,providerModel:produced.model,
        storage:stored,generationTimeSeconds:produced.generationTimeSeconds,
      };
    }catch(error){
      const message=error instanceof Error?error.message:String(error);
      if(jobId){try{await this.repo.failJob(jobId,'EF06_AUDIO_GENERATION_FAILED',message.slice(0,2000));}catch{}}
      if(generationId){try{await this.repo.failGeneration(generationId,'EF06_AUDIO_GENERATION_FAILED',message.slice(0,2000));}catch{}}
      try{await this.moduleRun.finishModule(req.moduleRunId,false,{
        module_code:'EF-06',content_uuid:req.contentUuid,workflow_run_id:req.workflowRunId,
        module_run_id:req.moduleRunId,audio_status:'FAILED',job_id:jobId??null,generation_id:generationId??null,
      },'EF06_AUDIO_GENERATION_FAILED',message.slice(0,2000));}catch{}
      throw error;
    }
  }
}
