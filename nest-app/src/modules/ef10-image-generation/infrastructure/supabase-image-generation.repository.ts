import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../common/supabase/supabase.service';
import {
  Ef10StoryboardSource,
  ImageGenerationRepository,
  SaveImageSetInput,
  SavedImageSet,
} from '../domain/repositories/image-generation.repository';
import { StoryboardShotInput } from '../domain/entities/image-generation.entity';

@Injectable()
export class SupabaseImageGenerationRepository extends ImageGenerationRepository {
  constructor(private readonly supabase: SupabaseService) {
    super();
  }

  async loadStoryboard(contentUuid: string): Promise<Ef10StoryboardSource> {
    // 1) content → project 정보
    const content = await this.one('geef_contents', 'id', contentUuid);
    const projectId = String(content.project_id);
    const project = await this.one('geef_projects', 'id', projectId);

    // 2) EF-09 STORYBOARD (is_current)
    const { data: sb, error: sbError } = await this.supabase.db
      .from('geef_generation_versions')
      .select('*')
      .eq('content_uuid', contentUuid)
      .eq('generation_type', 'STORYBOARD')
      .eq('is_current', true)
      .maybeSingle();

    if (sbError) {
      throw new Error(`STORYBOARD query failed: ${sbError.message}`);
    }
    if (!sb) {
      throw new Error(`STORYBOARD current generation not found: ${contentUuid}`);
    }

    const payload = this.obj(sb.result_payload);
    const scenes = Array.isArray(payload.scenes) ? payload.scenes : [];
    const shots: StoryboardShotInput[] = [];

    for (const rawScene of scenes) {
      const scene = this.obj(rawScene);
      const sceneOrder = Number(scene.scene_order ?? 0);
      const sceneName = String(scene.scene_name ?? '');
      const sceneShots = Array.isArray(scene.shots) ? scene.shots : [];

      for (const rawShot of sceneShots) {
        const shot = this.obj(rawShot);
        shots.push({
          sceneOrder,
          sceneName,
          shotOrder: Number(shot.shot_order ?? 0),
          shotId: String(shot.shot_id ?? `S${sceneOrder}-C${shot.shot_order ?? 0}`),
          visualDescription: String(shot.visual_description ?? ''),
          shotSize: String(shot.shot_size ?? ''),
          cameraAngle: String(shot.camera_angle ?? ''),
          cameraMovement: String(shot.camera_movement ?? ''),
          composition: String(shot.composition ?? ''),
          lighting: String(shot.lighting ?? ''),
          colorMood: String(shot.color_mood ?? ''),
        });
      }
    }

    if (shots.length === 0) {
      throw new Error(`STORYBOARD has no shots: ${contentUuid}`);
    }

    return {
      contentUuid,
      projectId,
      projectCode: String(project.project_code ?? ''),
      storyboardGenerationId: String(sb.id),
      title: String(payload.title ?? ''),
      aspectRatio: String(payload.aspect_ratio ?? '16:9'),
      globalStyle: this.obj(payload.global_style),
      shots,
    };
  }

  async saveImageSet(input: SaveImageSetInput): Promise<SavedImageSet> {
    const result = await this.supabase.rpc('geef_save_image_set', {
      p_content_uuid: input.contentUuid,
      p_module_run_id: input.moduleRunId,
      p_provider: input.provider,
      p_model_name: input.modelName,
      p_artifact_kind: input.artifactKind,
      p_artifacts: input.artifacts.map((a) => ({
        shot_id: a.shotId,
        artifact_name: a.artifactName,
        storage_bucket: a.storageBucket,
        storage_path: a.storagePath,
        public_url: a.publicUrl ?? null,
        mime_type: a.mimeType,
        size_bytes: a.sizeBytes,
        checksum_sha256: a.checksumSha256 ?? null,
        metadata: a.metadata ?? {},
      })),
      p_prompt_text: input.promptText,
      p_prompt_hash: input.promptHash,
      p_parameters: input.parameters,
      p_result_payload: input.resultPayload,
    });

    const row = Array.isArray(result) ? result[0] : result;
    if (!row || typeof row !== 'object') {
      throw new Error('EF-10 save RPC returned no row');
    }
    const value = row as Record<string, unknown>;

    return {
      generationId: String(value.generation_id),
      versionNo: Number(value.version_no),
      isCurrent: Boolean(value.is_current),
      createdAt: String(value.created_at),
      artifactIds: Array.isArray(value.artifact_ids)
        ? (value.artifact_ids as unknown[]).map((x) => String(x))
        : [],
    };
  }

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

  private obj(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }
}
