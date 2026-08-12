import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../common/supabase/supabase.service';
import {
  Ef11VideoSource,
  SaveVideoSetInput,
  SavedVideoSet,
  VideoGenerationRepository,
} from '../domain/repositories/video-generation.repository';
import { VideoShotInput } from '../domain/entities/video-generation.entity';

@Injectable()
export class SupabaseVideoGenerationRepository extends VideoGenerationRepository {
  constructor(private readonly supabase: SupabaseService) {
    super();
  }

  async loadSource(contentUuid: string): Promise<Ef11VideoSource> {
    const content = await this.one('geef_contents', 'id', contentUuid);
    const projectId = String(content.project_id);
    const project = await this.one('geef_projects', 'id', projectId);

    // EF-09 STORYBOARD (shot 메타)
    const storyboard = await this.currentGeneration(contentUuid, 'STORYBOARD');
    const sbPayload = this.obj(storyboard.result_payload);

    // EF-10 IMAGE_SET (shot 이미지 매핑)
    const imageSet = await this.currentGeneration(contentUuid, 'IMAGE_SET');
    const isPayload = this.obj(imageSet.result_payload);
    const imagesByShot = new Map<string, Record<string, unknown>>();
    if (Array.isArray(isPayload.images)) {
      for (const raw of isPayload.images) {
        const img = this.obj(raw);
        if (img.status === 'GENERATED' && typeof img.shot_id === 'string') {
          imagesByShot.set(img.shot_id, img);
        }
      }
    }

    const shots: VideoShotInput[] = [];
    const scenes = Array.isArray(sbPayload.scenes) ? sbPayload.scenes : [];
    for (const rawScene of scenes) {
      const scene = this.obj(rawScene);
      const sceneOrder = Number(scene.scene_order ?? 0);
      const sceneShots = Array.isArray(scene.shots) ? scene.shots : [];
      for (const rawShot of sceneShots) {
        const shot = this.obj(rawShot);
        const shotId = String(shot.shot_id ?? '');
        const img = imagesByShot.get(shotId);
        // 이미지가 있는 shot 만 image-to-video 대상으로 포함
        if (!img) continue;
        shots.push({
          sceneOrder,
          shotOrder: Number(shot.shot_order ?? 0),
          shotId,
          durationSec: Number(shot.duration_sec ?? 5),
          visualDescription: String(shot.visual_description ?? ''),
          cameraMovement: String(shot.camera_movement ?? ''),
          musicCue: String(shot.music_cue ?? ''),
          imageArtifactId:
            typeof img.artifact_id === 'string' ? img.artifact_id : null,
          imagePublicUrl:
            typeof img.public_url === 'string' ? img.public_url : null,
          imageStorageBucket:
            typeof img.storage_bucket === 'string' ? img.storage_bucket : null,
          imageStoragePath:
            typeof img.storage_path === 'string' ? img.storage_path : null,
        });
      }
    }

    if (shots.length === 0) {
      throw new Error(
        `No shots with generated images found for content: ${contentUuid}`,
      );
    }

    return {
      contentUuid,
      projectId,
      projectCode: String(project.project_code ?? ''),
      storyboardGenerationId: String(storyboard.id),
      imageSetGenerationId: String(imageSet.id),
      title: String(sbPayload.title ?? ''),
      aspectRatio: String(sbPayload.aspect_ratio ?? '16:9'),
      shots,
    };
  }

  async downloadImage(
    bucket: string,
    path: string,
  ): Promise<{ bytes: Buffer; mimeType: string } | null> {
    const { data, error } = await this.supabase.db.storage
      .from(bucket)
      .download(path);
    if (error || !data) {
      return null;
    }
    const arrayBuf = await data.arrayBuffer();
    const bytes = Buffer.from(arrayBuf);
    const mimeType =
      (data as { type?: string }).type ||
      (path.endsWith('.png') ? 'image/png' : 'image/jpeg');
    return { bytes, mimeType };
  }

  async saveVideoSet(input: SaveVideoSetInput): Promise<SavedVideoSet> {
    const result = await this.supabase.rpc('geef_save_video_set', {
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
        duration_sec: a.durationSec,
        metadata: a.metadata ?? {},
      })),
      p_prompt_text: input.promptText,
      p_prompt_hash: input.promptHash,
      p_parameters: input.parameters,
      p_result_payload: input.resultPayload,
    });

    const row = Array.isArray(result) ? result[0] : result;
    if (!row || typeof row !== 'object') {
      throw new Error('EF-11 save RPC returned no row');
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

  private obj(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }
}
