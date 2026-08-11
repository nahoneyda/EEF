import { Injectable } from '@nestjs/common';

import { SupabaseService } from '../../../common/supabase/supabase.service';

import {
  Ef02LyricsData,
  Ef03ContentMetadata,
  Ef03ContextData,
  MusicSpecRepository,
  SaveMusicSpecInput,
  SavedMusicSpec,
} from '../domain/repositories/music-spec.repository';

@Injectable()
export class SupabaseMusicSpecRepository extends MusicSpecRepository {
  constructor(private readonly supabase: SupabaseService) {
    super();
  }

  /**
   * EF-01 Context 조회
   */
  async getContext(contentUuid: string): Promise<Ef03ContextData> {
    const { data, error } = await this.supabase.db
      .from('geef_project_contexts')
      .select('*')
      .eq('content_uuid', contentUuid)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to read EF-01 context: ${error.message}`);
    }

    if (!data) {
      throw new Error(`EF-01 context not found: ${contentUuid}`);
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

      mood: Array.isArray(data.mood) ? data.mood.map(String) : [],

      targetAudience: String(data.target_audience ?? ''),

      vocalStyle: String(data.vocal_style ?? ''),

      targetDurationSeconds: Number(data.target_duration_seconds ?? 210),

      tempoBpm: Number(data.tempo_bpm ?? 76),

      musicalKey: String(data.musical_key ?? ''),

      timeSignature: String(data.time_signature ?? '4/4'),
    };
  }

  /**
   * EF-02 Lyrics 조회
   */
  async getLyrics(contentUuid: string): Promise<Ef02LyricsData> {
    const { data, error } = await this.supabase.db
      .from('geef_project_lyrics')
      .select('*')
      .eq('content_uuid', contentUuid)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to read EF-02 lyrics: ${error.message}`);
    }

    if (!data) {
      throw new Error(`EF-02 lyrics not found: ${contentUuid}`);
    }

    if (data.lyrics_status !== 'READY') {
      throw new Error(
        [
          'EF-02 lyrics are not READY',
          `contentUuid=${contentUuid}`,
          `status=${String(data.lyrics_status)}`,
        ].join(' '),
      );
    }

    const lyrics =
      data.lyrics &&
      typeof data.lyrics === 'object' &&
      !Array.isArray(data.lyrics)
        ? (data.lyrics as Record<string, string>)
        : {};

    return {
      titleKo: String(data.title_ko ?? ''),

      titleEn: data.title_en ? String(data.title_en) : undefined,

      concept: String(data.concept ?? ''),

      hookLine: String(data.hook_line ?? ''),

      lyrics,

      lyricKeywords: Array.isArray(data.lyric_keywords)
        ? data.lyric_keywords.map(String)
        : [],

      language: String(data.language ?? 'ko'),
    };
  }

  /**
   * Content / Project Metadata 조회
   */
  async getContentMetadata(contentUuid: string): Promise<Ef03ContentMetadata> {
    const { data: content, error: contentError } = await this.supabase.db
      .from('geef_contents')
      .select('id, content_id, project_id')
      .eq('id', contentUuid)
      .maybeSingle();

    if (contentError) {
      throw new Error(`Failed to read content: ${contentError.message}`);
    }

    if (!content) {
      throw new Error(`Content not found: ${contentUuid}`);
    }

    const { data: project, error: projectError } = await this.supabase.db
      .from('geef_projects')
      .select('id, project_code')
      .eq('id', content.project_id)
      .maybeSingle();

    if (projectError) {
      throw new Error(`Failed to read project: ${projectError.message}`);
    }

    if (!project) {
      throw new Error(`Project not found: ${String(content.project_id)}`);
    }

    return {
      contentUuid: String(content.id),

      contentId: String(content.content_id),

      projectId: String(content.project_id),

      projectCode: String(project.project_code),
    };
  }

  /**
   * EF-03 Music Specification 저장
   *
   * SSOT:
   * content_music_specs
   *
   * Unique 기준:
   * content_uuid + spec_version
   */
  async save(input: SaveMusicSpecInput): Promise<SavedMusicSpec> {
    const base = input.musicSpec.toPersistence();

    /**
     * 현재 DB에는 provider_profile JSONB가 있으므로
     * provider/model/prompt 추적정보를 이곳에 통합합니다.
     */
    const providerProfile = {
      provider: input.musicSpec.modelProvider ?? 'google',

      model:
        input.musicSpec.modelName ??
        (typeof input.generationInfo?.model === 'string'
          ? input.generationInfo.model
          : null),

      prompt_version: input.musicSpec.promptVersion ?? null,

      generation_info: input.generationInfo ?? {},
    };

    /**
     * 실제 content_music_specs 스키마에 존재하는
     * 컬럼만 저장합니다.
     */
    const payload = {
      content_uuid: input.metadata.contentUuid,

      workflow_run_id: input.workflowRunId,

      module_run_id: input.moduleRunId,

      spec_version: input.musicSpec.specVersion,

      genre: input.musicSpec.genre,

      subgenre: input.musicSpec.subgenre ?? null,

      bpm: input.musicSpec.bpm,

      musical_key: input.musicSpec.musicalKey,

      time_signature: input.musicSpec.timeSignature,

      target_duration_sec: input.musicSpec.targetDurationSec,

      energy: input.musicSpec.energy ?? null,

      valence: input.musicSpec.valence ?? null,

      danceability: input.musicSpec.danceability ?? null,

      mood: input.musicSpec.mood,

      instrumentation: base.instrumentation,

      vocal_spec: base.vocal_spec,

      arrangement: base.arrangement,

      production_style: base.production_style,

      generation_constraints: base.generation_constraints,

      provider_profile: providerProfile,

      status: 'READY',

      source_module: 'EF-03',

      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase.db
      .from('content_music_specs')
      .upsert(payload, {
        onConflict: 'content_uuid,spec_version',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save EF-03 music spec: ${error.message}`);
    }

    return {
      id: data?.id,

      contentUuid: data?.content_uuid,

      status: data?.status,

      raw: data,
    };
  }
}
