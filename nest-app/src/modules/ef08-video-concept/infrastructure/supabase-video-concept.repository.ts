import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../common/supabase/supabase.service';
import {
  SavedVideoConceptVersion,
  SaveVideoConceptInput,
  VideoConceptRepository,
  VideoConceptSources,
} from '../domain/repositories/video-concept.repository';

@Injectable()
export class SupabaseVideoConceptRepository extends VideoConceptRepository {
  constructor(private readonly supabase: SupabaseService) {
    super();
  }

  async loadSources(contentUuid: string): Promise<VideoConceptSources> {
    const [
      content,
      context,
      lyrics,
      musicSpec,
      compositionPlan,
      providerPackage,
      audioGeneration,
      audioReview,
    ] = await Promise.all([
      this.one('geef_contents', 'id', contentUuid),
      this.latest('geef_project_contexts', contentUuid),
      this.latest('geef_project_lyrics', contentUuid),
      this.latest('content_music_specs', contentUuid),

      // EF-04: 작곡 계획 전용 테이블
      this.currentCompositionPlan(contentUuid),

      // EF-05: Provider 패키지 전용 테이블
      this.currentProviderPackage(contentUuid),

      // EF-06: 완료된 오디오
      this.latestCompletedAudio(contentUuid),

      // EF-07: 승인된 오디오 검수
      this.approvedReview(contentUuid),
    ]);

    return {
      content,
      context,
      lyrics,
      musicSpec,
      compositionPlan,
      providerPackage,
      audioGeneration,
      audioReview,
    };
  }

  async saveVersion(
    input: SaveVideoConceptInput,
  ): Promise<SavedVideoConceptVersion> {
    const result = await this.supabase.rpc('geef_save_video_concept_version', {
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
      throw new Error('EF-08 save RPC returned no row');
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
   * EF-04 작곡 계획 조회
   *
   * EF-04 결과는 geef_generation_versions가 아니라
   * project_composition_plans에 저장된다.
   */
  private async currentCompositionPlan(
    contentUuid: string,
  ): Promise<Record<string, unknown>> {
    const response = await this.supabase.db
      .from('project_composition_plans')
      .select('*')
      .eq('content_uuid', contentUuid)
      .eq('plan_status', 'READY')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (response.error) {
      throw new Error(
        `EF-04 composition plan query failed: ${response.error.message}`,
      );
    }

    if (!response.data) {
      throw new Error(`EF-04 READY composition plan not found: ${contentUuid}`);
    }

    return response.data as Record<string, unknown>;
  }

  /**
   * EF-05 Provider 패키지 조회
   *
   * EF-05 결과는 geef_generation_versions가 아니라
   * project_composition_packages에 저장된다.
   */
  private async currentProviderPackage(
    contentUuid: string,
  ): Promise<Record<string, unknown>> {
    const response = await this.supabase.db
      .from('project_composition_packages')
      .select('*')
      .eq('content_uuid', contentUuid)
      .eq('package_status', 'READY')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (response.error) {
      throw new Error(
        `EF-05 provider package query failed: ${response.error.message}`,
      );
    }

    if (!response.data) {
      throw new Error(`EF-05 READY provider package not found: ${contentUuid}`);
    }

    return response.data as Record<string, unknown>;
  }

  /**
   * EF-06 완료된 오디오 생성 결과 조회
   */
  private async latestCompletedAudio(
    contentUuid: string,
  ): Promise<Record<string, unknown>> {
    const response = await this.supabase.db
      .from('project_audio_generations')
      .select('*')
      .eq('content_uuid', contentUuid)
      .eq('generation_status', 'COMPLETED')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (response.error) {
      throw new Error(`EF-06 audio query failed: ${response.error.message}`);
    }

    if (!response.data) {
      throw new Error(`EF-06 COMPLETED audio not found: ${contentUuid}`);
    }

    return response.data as Record<string, unknown>;
  }

  /**
   * EF-07 승인된 오디오 검수 결과 조회
   */
  private async approvedReview(
    contentUuid: string,
  ): Promise<Record<string, unknown>> {
    const response = await this.supabase.db
      .from('geef_reviews')
      .select('*')
      .eq('content_uuid', contentUuid)
      .eq('decision', 'APPROVED')
      .order('review_round', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (response.error) {
      throw new Error(`EF-07 review query failed: ${response.error.message}`);
    }

    if (!response.data) {
      throw new Error(`EF-07 APPROVED review not found: ${contentUuid}`);
    }

    return response.data as Record<string, unknown>;
  }
}
