import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../common/supabase/supabase.service';
import {
  Ef05CompositionPlanData,
  Ef05ContentMetadata,
  Ef05LyricsData,
  Ef05MusicSpecData,
  ProviderPackageRepository,
  SavedProviderPackage,
} from '../domain/repositories/provider-package.repository';
import { ProviderPackage } from '../domain/entities/provider-package.entity';

@Injectable()
export class SupabaseProviderPackageRepository extends ProviderPackageRepository {
  constructor(private readonly supabase: SupabaseService) {
    super();
  }

  async getContentMetadata(contentUuid: string): Promise<Ef05ContentMetadata> {
    const { data: content, error: contentError } =
      await this.supabase.db
        .from('geef_contents')
        .select('id,content_id,project_id')
        .eq('id', contentUuid)
        .maybeSingle();

    if (contentError || !content) {
      throw new Error(`Content not found: ${contentUuid}`);
    }

    const { data: project, error: projectError } =
      await this.supabase.db
        .from('geef_projects')
        .select('id,project_code')
        .eq('id', content.project_id)
        .maybeSingle();

    if (projectError || !project) {
      throw new Error(`Project not found: ${String(content.project_id)}`);
    }

    return {
      contentUuid: String(content.id),
      contentId: String(content.content_id),
      projectId: String(content.project_id),
      projectCode: String(project.project_code),
    };
  }

  async getLyrics(contentUuid: string): Promise<Ef05LyricsData> {
    const { data, error } =
      await this.supabase.db
        .from('geef_project_lyrics')
        .select('*')
        .eq('content_uuid', contentUuid)
        .limit(1)
        .maybeSingle();

    if (error || !data || data.lyrics_status !== 'READY') {
      throw new Error(`EF-02 READY lyrics not found: ${contentUuid}`);
    }

    return {
      titleKo: String(data.title_ko ?? ''),
      titleEn: String(data.title_en ?? ''),
      concept: String(data.concept ?? ''),
      hookLine: String(data.hook_line ?? ''),
      lyrics: this.stringRecord(data.lyrics),
      lyricKeywords: Array.isArray(data.lyric_keywords)
        ? data.lyric_keywords.map(String)
        : [],
      language: String(data.language ?? 'ko'),
    };
  }

  async getMusicSpec(contentUuid: string): Promise<Ef05MusicSpecData> {
    const { data, error } =
      await this.supabase.db
        .from('content_music_specs')
        .select('*')
        .eq('content_uuid', contentUuid)
        .eq('status', 'READY')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) {
      throw new Error(`EF-03 READY music spec not found: ${contentUuid}`);
    }

    return {
      genre: String(data.genre ?? ''),
      subgenre: data.subgenre ? String(data.subgenre) : undefined,
      bpm: Number(data.bpm),
      musicalKey: String(data.musical_key ?? ''),
      timeSignature: String(data.time_signature ?? '4/4'),
      targetDurationSec: Number(data.target_duration_sec ?? 210),
      mood: Array.isArray(data.mood) ? data.mood.map(String) : [],
      instrumentation: this.objectValue(data.instrumentation),
      vocalSpec: this.objectValue(data.vocal_spec),
      arrangement: this.objectValue(data.arrangement),
      productionStyle: this.objectValue(data.production_style),
      generationConstraints: this.objectValue(data.generation_constraints),
    };
  }

  async getCompositionPlan(contentUuid: string): Promise<Ef05CompositionPlanData> {
    const { data, error } =
      await this.supabase.db
        .from('project_composition_plans')
        .select('*')
        .eq('content_uuid', contentUuid)
        .eq('plan_status', 'READY')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) {
      throw new Error(`EF-04 READY composition plan not found: ${contentUuid}`);
    }

    return {
      planVersion: String(data.plan_version ?? 'v1.0'),
      titleKo: String(data.title_ko ?? ''),
      titleEn: String(data.title_en ?? ''),
      language: String(data.language ?? 'ko'),
      targetDurationSec: Number(data.target_duration_sec ?? 210),
      bpm: Number(data.bpm),
      musicalKey: String(data.musical_key ?? ''),
      timeSignature: String(data.time_signature ?? '4/4'),
      songStructure: Array.isArray(data.song_structure) ? data.song_structure : [],
      sectionTiming: this.objectValue(data.section_timing),
      harmonyPlan: this.objectValue(data.harmony_plan),
      melodyPlan: this.objectValue(data.melody_plan),
      rhythmPlan: this.objectValue(data.rhythm_plan),
      vocalPhrasingPlan: this.objectValue(data.vocal_phrasing_plan),
      instrumentationCues: Array.isArray(data.instrumentation_cues)
        ? data.instrumentation_cues
        : [],
      dynamicsPlan: this.objectValue(data.dynamics_plan),
      transitionPlan: Array.isArray(data.transition_plan) ? data.transition_plan : [],
      hookStrategy: this.objectValue(data.hook_strategy),
      generationConstraints: this.objectValue(data.generation_constraints),
    };
  }

  async save(providerPackage: ProviderPackage): Promise<SavedProviderPackage> {
    const payload = {
      ...providerPackage.toPersistence(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } =
      await this.supabase.db
        .from('project_composition_packages')
        .upsert(payload, {
          onConflict: 'content_uuid,package_version',
        })
        .select()
        .single();

    if (error) {
      throw new Error(`Failed to save EF-05 provider package: ${error.message}`);
    }

    return {
      id: data?.id,
      contentUuid: data?.content_uuid,
      status: data?.package_status,
      raw: data,
    };
  }

  private objectValue(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private stringRecord(value: unknown): Record<string, string> {
    const source = this.objectValue(value);
    const result: Record<string, string> = {};
    for (const [key, raw] of Object.entries(source)) {
      if (typeof raw === 'string') result[key] = raw;
    }
    return result;
  }
}
