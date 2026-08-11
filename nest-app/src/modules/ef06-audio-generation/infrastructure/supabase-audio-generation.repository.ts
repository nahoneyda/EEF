import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../common/supabase/supabase.service';
import {
  AudioGenerationRepository,
  CreateAudioJobInput,
  CreateGenerationInput,
  Ef06ProviderPackage,
} from '../domain/repositories/audio-generation.repository';
import {
  AudioGenerationStatus,
  AudioJobStatus,
  AudioProviderResult,
  AudioRequestStatus,
  StoredAudioObject,
} from '../domain/entities/audio-generation.entity';

@Injectable()
export class SupabaseAudioGenerationRepository extends AudioGenerationRepository {
  constructor(private readonly supabase: SupabaseService) {
    super();
  }

  async getProviderPackage(contentUuid: string): Promise<Ef06ProviderPackage> {
    const { data, error } = await this.supabase.db
      .from('project_composition_packages')
      .select('*')
      .eq('content_uuid', contentUuid)
      .eq('package_status', 'READY')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data)
      throw new Error(
        `EF-05 READY package not found: ${contentUuid}${error ? ` ${error.message}` : ''}`,
      );
    return {
      id: String(data.id),
      projectId: String(data.project_id),
      projectCode: String(data.project_code),
      contentUuid: String(data.content_uuid),
      packageVersion: String(data.package_version ?? 'v1.0'),
      providerPrompt: String(data.provider_prompt ?? ''),
      outputAudioFormat: String(data.output_audio_format ?? 'mp3'),
      generationParameters: this.obj(data.generation_parameters),
      packageStatus: 'READY',
    };
  }

  async createJob(i: CreateAudioJobInput): Promise<{ jobId: string }> {
    const { data, error } = await this.supabase.db
      .from('project_audio_jobs')
      .insert({
        project_id: i.projectId,
        geef_project_id: i.projectId,
        project_code: i.projectCode,
        content_uuid: i.contentUuid,
        workflow_run_id: i.workflowRunId,
        module_run_id: i.moduleRunId,
        composition_package_id: i.compositionPackageId,
        job_type: i.jobType,
        provider: i.provider,
        provider_model: i.providerModel,
        input_prompt: i.inputPrompt,
        response_format: 'audio',
        job_status: 'QUEUED',
        attempt_count: 0,
        max_attempts: i.maxAttempts,
        storage_bucket: i.storageBucket,
        request_payload: i.requestPayload,
      })
      .select('job_id')
      .single();
    if (error || !data)
      throw new Error(
        `Failed to create audio job: ${error?.message ?? 'no data'}`,
      );
    return { jobId: String(data.job_id) };
  }

  async createGeneration(i: CreateGenerationInput): Promise<{ id: string }> {
    const { data, error } = await this.supabase.db
      .from('project_audio_generations')
      .insert({
        workflow_version: 'EF-1.0',
        module: 'EF-06',
        module_version: 'EF-06-V1',
        project_id: i.projectId,
        geef_project_id: i.projectId,
        project_code: i.projectCode,
        content_uuid: i.contentUuid,
        workflow_run_id: i.workflowRunId,
        module_run_id: i.moduleRunId,
        composition_package_id: i.compositionPackageId,
        provider: i.provider,
        provider_model: i.providerModel,
        request_status: 'PENDING',
        generation_status: 'PENDING',
        request_payload: i.requestPayload,
        provider_response: {},
        retry_count: 0,
      })
      .select('id')
      .single();
    if (error || !data)
      throw new Error(
        `Failed to create audio generation: ${error?.message ?? 'no data'}`,
      );
    return { id: String(data.id) };
  }

  async updateJobStatus(
    id: string,
    status: AudioJobStatus,
    patch: Record<string, unknown> = {},
  ): Promise<void> {
    const p: Record<string, unknown> = {
      job_status: status,
      updated_at: new Date().toISOString(),
      ...patch,
    };
    if (status === 'PROCESSING') {
      p.started_at = new Date().toISOString();
      p.attempt_count = 1;
    }
    const { error } = await this.supabase.db
      .from('project_audio_jobs')
      .update(p)
      .eq('job_id', id);
    if (error) throw new Error(`Failed to update audio job: ${error.message}`);
  }

  async updateGenerationStatus(
    id: string,
    request: AudioRequestStatus,
    status: AudioGenerationStatus,
    patch: Record<string, unknown> = {},
  ): Promise<void> {
    const { error } = await this.supabase.db
      .from('project_audio_generations')
      .update({
        request_status: request,
        generation_status: status,
        updated_at: new Date().toISOString(),
        ...patch,
      })
      .eq('id', id);
    if (error)
      throw new Error(`Failed to update audio generation: ${error.message}`);
  }

  async completeJob(
    id: string,
    s: StoredAudioObject,
    providerId?: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.supabase.db
      .from('project_audio_jobs')
      .update({
        job_status: 'COMPLETED',
        storage_bucket: s.bucket,
        storage_path: s.path,
        audio_mime_type: s.mimeType,
        audio_public_url: s.publicUrl ?? null,
        provider_interaction_id: providerId ?? null,
        completed_at: now,
        updated_at: now,
      })
      .eq('job_id', id);
    if (error)
      throw new Error(`Failed to complete audio job: ${error.message}`);
  }

  async completeGeneration(
    id: string,
    r: AudioProviderResult,
    s: StoredAudioObject,
  ): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.supabase.db
      .from('project_audio_generations')
      .update({
        provider_generation_id: r.providerGenerationId ?? null,
        request_status: 'ACCEPTED',
        generation_status: 'COMPLETED',
        provider_response: r.rawMetadata,
        audio_format: s.extension,
        audio_mime_type: s.mimeType,
        audio_storage_bucket: s.bucket,
        audio_storage_path: s.path,
        audio_public_url: s.publicUrl ?? null,
        file_size_bytes: s.fileSizeBytes,
        generation_time_seconds: r.generationTimeSeconds,
        generated_at: now,
        uploaded_at: now,
        updated_at: now,
      })
      .eq('id', id);
    if (error)
      throw new Error(`Failed to complete audio generation: ${error.message}`);
  }

  async failJob(id: string, code: string, message: string): Promise<void> {
    await this.updateJobStatus(id, 'FAILED', {
      error_code: code,
      error_message: message,
      failed_at: new Date().toISOString(),
    });
  }
  async failGeneration(
    id: string,
    code: string,
    message: string,
  ): Promise<void> {
    await this.updateGenerationStatus(id, 'FAILED', 'FAILED', {
      error_code: code,
      error_message: message,
    });
  }
  private obj(v: unknown): Record<string, unknown> {
    return v && typeof v === 'object' && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : {};
  }
}
