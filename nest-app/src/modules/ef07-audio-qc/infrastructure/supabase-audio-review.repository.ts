import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../common/supabase/supabase.service';
import { AudioReviewRepository } from '../domain/repositories/audio-review.repository';
import {
  AudioGenerationSource,
  AudioQcResult,
  AudioTechnicalAnalysis,
  SavedReview,
} from '../domain/entities/audio-review.entity';

@Injectable()
export class SupabaseAudioReviewRepository extends AudioReviewRepository {
  constructor(private readonly supabase: SupabaseService) {
    super();
  }

  async getLatestCompletedAudio(contentUuid: string): Promise<AudioGenerationSource> {
    const { data, error } = await this.supabase.db
      .from('project_audio_generations')
      .select('*')
      .eq('content_uuid', contentUuid)
      .eq('generation_status', 'COMPLETED')
      .not('audio_storage_bucket', 'is', null)
      .not('audio_storage_path', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data)
      throw new Error(`EF-06 COMPLETED audio not found: ${contentUuid}${error ? ` ${error.message}` : ''}`);
    return {
      id: String(data.id),
      contentUuid: String(data.content_uuid),
      workflowRunId: this.str(data.workflow_run_id),
      moduleRunId: this.str(data.module_run_id),
      storageBucket: String(data.audio_storage_bucket),
      storagePath: String(data.audio_storage_path),
      publicUrl: this.str(data.audio_public_url),
      format: this.str(data.audio_format),
      mimeType: this.str(data.audio_mime_type),
      durationSeconds: this.number(data.duration_seconds),
      sampleRate: this.number(data.sample_rate),
      bitDepth: this.number(data.bit_depth),
      channels: this.number(data.channels),
      fileSizeBytes: this.number(data.file_size_bytes),
      requestPayload: this.obj(data.request_payload),
      createdAt: String(data.created_at),
    };
  }

  async downloadAudio(source: AudioGenerationSource): Promise<Buffer> {
    const { data, error } = await this.supabase.db.storage
      .from(source.storageBucket)
      .download(source.storagePath);
    if (error || !data) throw new Error(`Audio download failed: ${error?.message ?? 'no data'}`);
    return Buffer.from(await data.arrayBuffer());
  }

  async upsertAutomaticReview(input: {
    contentUuid: string;
    result: AudioQcResult;
    analysis: AudioTechnicalAnalysis;
    source: AudioGenerationSource;
    runMode: string;
  }): Promise<SavedReview> {
    const now = new Date().toISOString();
    const checklist = {
      schemaVersion: 'EF-07-V1',
      automaticReview: true,
      runMode: input.runMode.toUpperCase(),
      source: {
        generationId: input.source.id,
        storageBucket: input.source.storageBucket,
        storagePath: input.source.storagePath,
        databaseMetadata: {
          format: input.source.format ?? null,
          mimeType: input.source.mimeType ?? null,
          durationSeconds: input.source.durationSeconds ?? null,
          sampleRate: input.source.sampleRate ?? null,
          bitDepth: input.source.bitDepth ?? null,
          channels: input.source.channels ?? null,
          fileSizeBytes: input.source.fileSizeBytes ?? null,
        },
      },
      measured: input.analysis,
      checks: input.result.checks,
      issues: input.result.issues,
    };
    const notes = input.result.issues.length
      ? input.result.issues.map((x) => `[${x.severity}] ${x.code}: ${x.message}`).join('\n')
      : 'EF-07 automatic audio QC passed.';
    const { data, error } = await this.supabase.db
      .from('geef_reviews')
      .upsert(
        {
          content_uuid: input.contentUuid,
          review_round: 1,
          decision: input.result.decision,
          score: input.result.score,
          reviewer_id: null,
          checklist,
          notes,
          decided_at: now,
          updated_at: now,
        },
        { onConflict: 'content_uuid,review_round' },
      )
      .select('id,content_uuid,review_round,decision,score')
      .single();
    if (error || !data) throw new Error(`Failed to upsert EF-07 review: ${error?.message ?? 'no data'}`);
    return {
      id: String(data.id),
      contentUuid: String(data.content_uuid),
      reviewRound: Number(data.review_round),
      decision: data.decision,
      score: data.score === null ? null : Number(data.score),
    } as SavedReview;
  }

  async upsertFatalReview(input: {
    contentUuid: string;
    runMode: string;
    errorCode: string;
    errorMessage: string;
  }): Promise<SavedReview> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase.db
      .from('geef_reviews')
      .upsert(
        {
          content_uuid: input.contentUuid,
          review_round: 1,
          decision: 'REJECTED',
          score: 0,
          reviewer_id: null,
          checklist: {
            schemaVersion: 'EF-07-V1',
            automaticReview: true,
            runMode: input.runMode,
            fatalError: { code: input.errorCode, message: input.errorMessage },
          },
          notes: `[FATAL] ${input.errorCode}: ${input.errorMessage}`,
          decided_at: now,
          updated_at: now,
        },
        { onConflict: 'content_uuid,review_round' },
      )
      .select('id,content_uuid,review_round,decision,score')
      .single();
    if (error || !data) throw new Error(`Failed to save rejected EF-07 review: ${error?.message ?? 'no data'}`);
    return {
      id: String(data.id), contentUuid: String(data.content_uuid),
      reviewRound: Number(data.review_round), decision: data.decision,
      score: data.score === null ? null : Number(data.score),
    } as SavedReview;
  }

  private str(value: unknown): string | undefined {
    return typeof value === 'string' && value ? value : undefined;
  }
  private number(value: unknown): number | undefined {
    const parsed = Number(value);
    return value !== null && value !== undefined && Number.isFinite(parsed) ? parsed : undefined;
  }
  private obj(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }
}
