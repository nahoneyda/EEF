import { Injectable } from '@nestjs/common';

import { SupabaseService } from '../../../common/supabase/supabase.service';

import {
  CompositionPlanRepository,
  Ef04ContentMetadata,
  Ef04LyricsData,
  Ef04MusicSpecData,
  SaveCompositionPlanInput,
  SavedCompositionPlan,
} from '../domain/repositories/composition-plan.repository';

@Injectable()
export class SupabaseCompositionPlanRepository
  extends CompositionPlanRepository
{
  constructor(
    private readonly supabase: SupabaseService,
  ) {
    super();
  }

  async getLyrics(
    contentUuid: string,
  ): Promise<Ef04LyricsData> {
    const { data, error } =
      await this.supabase.db
        .from('geef_project_lyrics')
        .select('*')
        .eq('content_uuid', contentUuid)
        .limit(1)
        .maybeSingle();

    if (error) {
      throw new Error(
        `Failed to read EF-02 lyrics: ${error.message}`,
      );
    }

    if (!data || data.lyrics_status !== 'READY') {
      throw new Error(
        `EF-02 READY lyrics not found: ${contentUuid}`,
      );
    }

    return {
      titleKo: String(data.title_ko ?? ''),
      titleEn: String(data.title_en ?? ''),
      concept: String(data.concept ?? ''),
      hookLine: String(data.hook_line ?? ''),
      lyrics:
        data.lyrics &&
        typeof data.lyrics === 'object' &&
        !Array.isArray(data.lyrics)
          ? data.lyrics as Record<string, string>
          : {},
      lyricKeywords:
        Array.isArray(data.lyric_keywords)
          ? data.lyric_keywords.map(String)
          : [],
      language: String(data.language ?? 'ko'),
    };
  }

  async getMusicSpec(
    contentUuid: string,
  ): Promise<Ef04MusicSpecData> {
    const { data, error } =
      await this.supabase.db
        .from('content_music_specs')
        .select('*')
        .eq('content_uuid', contentUuid)
        .eq('status', 'READY')
        .order('updated_at', {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (error) {
      throw new Error(
        `Failed to read EF-03 music spec: ${error.message}`,
      );
    }

    if (!data) {
      throw new Error(
        `EF-03 READY music spec not found: ${contentUuid}`,
      );
    }

    return {
      specVersion: String(data.spec_version ?? 'v1.0'),
      genre: String(data.genre ?? ''),
      subgenre:
        data.subgenre ? String(data.subgenre) : undefined,
      bpm: Number(data.bpm),
      musicalKey: String(data.musical_key ?? ''),
      timeSignature: String(data.time_signature ?? '4/4'),
      targetDurationSec: Number(data.target_duration_sec ?? 210),
      energy:
        data.energy === null || data.energy === undefined
          ? undefined
          : Number(data.energy),
      valence:
        data.valence === null || data.valence === undefined
          ? undefined
          : Number(data.valence),
      danceability:
        data.danceability === null || data.danceability === undefined
          ? undefined
          : Number(data.danceability),
      mood:
        Array.isArray(data.mood)
          ? data.mood.map(String)
          : [],
      instrumentation:
        this.objectValue(data.instrumentation),
      vocalSpec:
        this.objectValue(data.vocal_spec),
      arrangement:
        this.objectValue(data.arrangement),
      productionStyle:
        this.objectValue(data.production_style),
      generationConstraints:
        this.objectValue(data.generation_constraints),
    };
  }

  async getContentMetadata(
    contentUuid: string,
  ): Promise<Ef04ContentMetadata> {
    const {
      data: content,
      error: contentError,
    } =
      await this.supabase.db
        .from('geef_contents')
        .select('id,content_id,project_id')
        .eq('id', contentUuid)
        .maybeSingle();

    if (contentError || !content) {
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
        .select('id,project_code')
        .eq('id', content.project_id)
        .maybeSingle();

    if (projectError || !project) {
      throw new Error(
        `Project not found: ${String(content.project_id)}`,
      );
    }

    return {
      contentUuid: content.id,
      contentId: content.content_id,
      projectId: content.project_id,
      projectCode: project.project_code,
    };
  }

  async save(
    input: SaveCompositionPlanInput,
  ): Promise<SavedCompositionPlan> {
    const base =
      input.compositionPlan.toPersistence();

    const payload = {
      content_uuid: input.metadata.contentUuid,
      workflow_run_id: input.workflowRunId,
      module_run_id: input.moduleRunId,

      ...base,

      source_music_spec: input.musicSpec,
      source_lyrics: input.lyrics,

      updated_at: new Date().toISOString(),
    };

    const { data, error } =
      await this.supabase.db
        .from('project_composition_plans')
        .upsert(payload, {
          onConflict:
            'content_uuid,plan_version',
        })
        .select()
        .single();

    if (error) {
      throw new Error(
        `Failed to save EF-04 composition plan: ${error.message}`,
      );
    }

    return {
      id: data?.id,
      contentUuid: data?.content_uuid,
      status: data?.plan_status,
      raw: data,
    };
  }

  private objectValue(
    value: unknown,
  ): Record<string, unknown> {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      return value as Record<string, unknown>;
    }
    return {};
  }
}
