import { Injectable } from '@nestjs/common';

import { SupabaseService } from '../../../common/supabase/supabase.service';

import {
  ContentMetadata,
  Ef01ContextData,
  LyricsRepository,
  SaveLyricsInput,
  SavedLyrics,
} from '../domain/repositories/lyrics.repository';

import { Lyrics } from '../domain/entities/lyrics.entity';

@Injectable()
export class SupabaseLyricsRepository
  extends LyricsRepository
{
  constructor(
    private readonly supabase:
      SupabaseService,
  ) {
    super();
  }

  async getContext(
    contentUuid: string,
  ): Promise<Ef01ContextData> {
    const { data, error } =
      await this.supabase.db
        .from('geef_project_contexts')
        .select('*')
        .eq('content_uuid', contentUuid)
        .limit(1)
        .maybeSingle();

    if (error) {
      throw new Error(
        `Failed to read EF-01 context: ${error.message}`,
      );
    }

    if (!data) {
      throw new Error(
        `EF-01 context not found: ${contentUuid}`,
      );
    }

    if (data.context_status !== 'READY') {
      throw new Error(
        [
          'EF-01 context is not READY',
          `contentUuid=${contentUuid}`,
          `status=${String(data.context_status)}`,
        ].join(' '),
      );
    }

    return {
      language: String(data.language ?? 'ko'),
      genre: String(data.genre ?? ''),
      theme: String(data.theme ?? ''),
      mood:
        Array.isArray(data.mood)
          ? data.mood.map(String)
          : [],
      targetAudience:
        String(data.target_audience ?? ''),
      vocalStyle:
        String(data.vocal_style ?? ''),
      targetDurationSeconds:
        Number(
          data.target_duration_seconds ?? 210,
        ),
      tempoBpm:
        Number(data.tempo_bpm ?? 76),
      instrumentStyle:
        String(data.instrument_style ?? ''),
      arrangementStyle:
        String(data.arrangement_style ?? ''),
      mixStyle:
        String(data.mix_style ?? ''),
      masterStyle:
        String(data.master_style ?? ''),
      musicalKey:
        String(data.musical_key ?? ''),
      timeSignature:
        String(data.time_signature ?? '4/4'),
      videoStyle:
        String(data.video_style ?? ''),
      aspectRatio:
        String(data.aspect_ratio ?? '16:9'),
      contextStatus: 'READY',
    };
  }

  async getContentMetadata(
    contentUuid: string,
  ): Promise<ContentMetadata> {
    const {
      data: content,
      error: contentError,
    } =
      await this.supabase.db
        .from('geef_contents')
        .select(
          'id, content_id, project_id',
        )
        .eq('id', contentUuid)
        .maybeSingle();

    if (contentError) {
      throw new Error(
        `Failed to read content: ${contentError.message}`,
      );
    }

    if (!content) {
      throw new Error(
        `Content not found: ${contentUuid}`,
      );
    }

    const {
      data: project,
      error: projectError,
    } =
      await this.supabase.db
        .from('geef_projects')
        .select(
          'id, project_code, project_name',
        )
        .eq('id', content.project_id)
        .maybeSingle();

    if (projectError) {
      throw new Error(
        `Failed to read project: ${projectError.message}`,
      );
    }

    if (!project) {
      throw new Error(
        `Project not found: ${String(content.project_id)}`,
      );
    }

    return {
      contentUuid: content.id,
      contentId: content.content_id,
      projectId: content.project_id,
      projectCode: project.project_code,
      projectName:
        project.project_name ?? undefined,
    };
  }

  async save(
    input: SaveLyricsInput,
  ): Promise<SavedLyrics> {
    const generationModel =
      typeof input.generationInfo?.model ===
        'string'
        ? input.generationInfo.model
        : input.lyrics.generationModel;

    const payload = {
      project_id:
        input.metadata.projectId,
      content_uuid:
        input.metadata.contentUuid,
      content_id:
        input.metadata.contentId,
      project_code:
        input.metadata.projectCode,
      ...input.lyrics.toPersistence(),
      generation_model:
        generationModel,
      workflow_run_id:
        input.workflowRunId,
      module_run_id:
        input.moduleRunId,
      source_payload: {
        ef01_context:
          input.context,
        google_ai:
          input.generationInfo ?? {},
      },
      updated_at:
        new Date().toISOString(),
    };

    const { data, error } =
      await this.supabase.db
        .from('geef_project_lyrics')
        .upsert(
          payload,
          {
            onConflict:
              'content_uuid',
          },
        )
        .select()
        .single();

    if (error) {
      throw new Error(
        `Failed to save EF-02 lyrics: ${error.message}`,
      );
    }

    return {
      id: data?.id,
      contentUuid:
        data?.content_uuid,
      contentId:
        data?.content_id,
      lyricsStatus:
        data?.lyrics_status,
      raw: data,
    };
  }

  async findByContentUuid(
    _contentUuid: string,
  ): Promise<Lyrics | null> {
    return null;
  }
}
