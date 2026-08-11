import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../common/supabase/supabase.service';
import {
  SavedStoryboardVersion,
  SaveStoryboardInput,
  StoryboardRepository,
  StoryboardSources,
} from '../domain/repositories/storyboard.repository';

@Injectable()
export class SupabaseStoryboardRepository extends StoryboardRepository {
  constructor(private readonly supabase: SupabaseService) {
    super();
  }

  async loadSources(contentUuid: string): Promise<StoryboardSources> {
    const [content, context, lyrics, musicSpec, videoConcept] =
      await Promise.all([
        this.one('geef_contents', 'id', contentUuid),
        this.latest('geef_project_contexts', contentUuid),
        this.latest('geef_project_lyrics', contentUuid),
        this.latest('content_music_specs', contentUuid),

        // EF-08: 승인/최신 뮤직비디오 콘셉트 (geef_generation_versions)
        this.currentGeneration(contentUuid, 'VIDEO_CONCEPT'),
      ]);

    return {
      content,
      context,
      lyrics,
      musicSpec,
      videoConcept,
    };
  }

  async saveVersion(
    input: SaveStoryboardInput,
  ): Promise<SavedStoryboardVersion> {
    const result = await this.supabase.rpc('geef_save_storyboard_version', {
      p_content_uuid: input.contentUuid,
      p_module_run_id: input.moduleRunId,
      p_provider: input.provider,
      p_model_name: input.modelName,
      p_prompt_text: input.promptText,
      p_prompt_hash: input.promptHash,
      p_parameters: input.parameters,
      p_result_payload: input.resultPayload,
    });

    const row = Array.isArray(result) ? result[0] : result;

    if (!row || typeof row !== 'object') {
      throw new Error('EF-09 save RPC returned no row');
    }

    const value = row as Record<string, unknown>;

    return {
      generationId: String(value.generation_id),
      versionNo: Number(value.version_no),
      isCurrent: Boolean(value.is_current),
      createdAt: String(value.created_at),
    };
  }

  /**
   * 단일 레코드 조회
   */
  private async one(
    table: string,
    key: string,
    value: string,
  ): Promise<Record<string, unknown>> {
    const response = await this.supabase.db
      .from(table)
      .select('*')
      .eq(key, value)
      .maybeSingle();

    if (response.error) {
      throw new Error(`${table} query failed: ${response.error.message}`);
    }

    if (!response.data) {
      throw new Error(`${table} source not found: ${value}`);
    }

    return response.data as Record<string, unknown>;
  }

  /**
   * 콘텐츠별 최신 레코드 조회
   */
  private async latest(
    table: string,
    contentUuid: string,
  ): Promise<Record<string, unknown>> {
    const response = await this.supabase.db
      .from(table)
      .select('*')
      .eq('content_uuid', contentUuid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (response.error) {
      throw new Error(`${table} query failed: ${response.error.message}`);
    }

    if (!response.data) {
      throw new Error(`${table} source not found: ${contentUuid}`);
    }

    return response.data as Record<string, unknown>;
  }

  /**
   * geef_generation_versions 에서 현재(is_current) 세대 조회
   *
   * EF-08 결과(VIDEO_CONCEPT)를 EF-09 입력으로 사용한다.
   */
  private async currentGeneration(
    contentUuid: string,
    generationType: string,
  ): Promise<Record<string, unknown>> {
    const response = await this.supabase.db
      .from('geef_generation_versions')
      .select('*')
      .eq('content_uuid', contentUuid)
      .eq('generation_type', generationType)
      .eq('is_current', true)
      .maybeSingle();

    if (response.error) {
      throw new Error(
        `${generationType} current generation query failed: ${response.error.message}`,
      );
    }

    if (!response.data) {
      throw new Error(
        `${generationType} current generation not found: ${contentUuid}`,
      );
    }

    return response.data as Record<string, unknown>;
  }
}
