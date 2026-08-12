import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { ModuleRunService } from '../../../../common/workflow/module-run/module-run.service';
import { ModelRegistryService } from '../../../../common/ai/model-registry.service';
import {
  Ef11VideoSource,
  SavedVideoArtifactInput,
  VideoGenerationRepository,
} from '../../domain/repositories/video-generation.repository';
import { VideoStorage } from '../../domain/services/video-services';
import {
  ShotVideoArtifact,
  VideoGenerationResult,
  VideoSetManifest,
  VideoShotInput,
} from '../../domain/entities/video-generation.entity';
import {
  buildVideoPrompt,
  VideoProviderSelector,
} from './build-video-prompt';

@Injectable()
export class GenerateVideosUseCase {
  private readonly logger = new Logger(GenerateVideosUseCase.name);

  constructor(
    private readonly repo: VideoGenerationRepository,
    private readonly providerSelector: VideoProviderSelector,
    private readonly storage: VideoStorage,
    private readonly moduleRun: ModuleRunService,
    private readonly models: ModelRegistryService,
    private readonly config: ConfigService,
  ) {}

  async execute(req: {
    contentUuid: string;
    workflowRunId: string;
    moduleRunId: string;
    runMode?: string;
  }): Promise<VideoGenerationResult> {
    await this.moduleRun.beginModule(req.moduleRunId);
    const runMode = (req.runMode ?? 'TEST').trim().toUpperCase();
    const production = runMode === 'PRODUCTION';
    const provider = this.providerSelector.select();

    try {
      const source = await this.repo.loadSource(req.contentUuid);

      const model =
        this.config.get<string>(
          production ? 'EF11_VIDEO_MODEL_PRODUCTION' : 'EF11_VIDEO_MODEL_TEST',
        ) ?? 'veo-3.1-generate-preview';
      const artifactKind =
        this.config.get<string>('EF11_ARTIFACT_KIND') ?? 'VIDEO';
      const concurrency = Math.max(
        1,
        Number(this.config.get<string>('EF11_CONCURRENCY') ?? '2'),
      );
      const clampDuration = (d: number): number => {
        // Veo 는 4/6/8초 지원. 가장 가까운 허용값으로 스냅.
        const allowed = [4, 6, 8];
        return allowed.reduce((a, b) =>
          Math.abs(b - d) < Math.abs(a - d) ? b : a,
        );
      };

      const results = await this.mapWithConcurrency(
        source.shots,
        concurrency,
        (shot) =>
          this.processShot(
            source,
            shot,
            model,
            clampDuration(shot.durationSec),
            provider,
            req.moduleRunId,
          ),
      );

      const succeeded = results.filter((r) => r.status === 'GENERATED');
      const filtered = results.filter((r) => r.status === 'FILTERED');
      const failed = results.filter((r) => r.status === 'FAILED');

      if (succeeded.length === 0) {
        const firstReason =
          failed[0]?.errorMessage ??
          filtered[0]?.raiFilteredReason ??
          'unknown';
        throw new Error(
          `EF-11 produced no videos (filtered=${filtered.length}, failed=${failed.length}); first reason: ${firstReason}`,
        );
      }

      const artifactsForSave: SavedVideoArtifactInput[] = succeeded.map((r) => ({
        shotId: r.shotId,
        artifactName: r.shotId,
        storageBucket: r.storage!.bucket,
        storagePath: r.storage!.path,
        publicUrl: r.storage!.publicUrl,
        mimeType: r.storage!.mimeType,
        sizeBytes: r.storage!.fileSizeBytes,
        checksumSha256: r.storage!.checksumSha256,
        durationSec: r.durationSec,
        metadata: {
          scene_order: r.sceneOrder,
          shot_order: r.shotOrder,
          prompt_text: r.promptText,
        },
      }));

      const totalDuration = succeeded.reduce((a, r) => a + r.durationSec, 0);

      const manifest: VideoSetManifest = {
        schema_version: 'EF-11-V1',
        provider: provider.provider,
        model,
        aspect_ratio: source.aspectRatio,
        total_shots: results.length,
        succeeded_shots: succeeded.length,
        failed_shots: failed.length,
        filtered_shots: filtered.length,
        total_duration_sec: totalDuration,
        clips: results.map((r) => ({
          shot_id: r.shotId,
          scene_order: r.sceneOrder,
          shot_order: r.shotOrder,
          status: r.status,
          artifact_id: null,
          storage_bucket: r.storage?.bucket ?? null,
          storage_path: r.storage?.path ?? null,
          public_url: r.storage?.publicUrl ?? null,
          mime_type: r.storage?.mimeType ?? null,
          size_bytes: r.storage?.fileSizeBytes ?? null,
          checksum_sha256: r.storage?.checksumSha256 ?? null,
          duration_sec: r.status === 'GENERATED' ? r.durationSec : null,
          rai_filtered_reason: r.raiFilteredReason ?? null,
        })),
      };

      const promptText = succeeded.map((r) => r.promptText).join('\n---\n');
      const promptHash = createHash('sha256')
        .update(promptText, 'utf8')
        .digest('hex');

      const saved = await this.repo.saveVideoSet({
        contentUuid: req.contentUuid,
        moduleRunId: req.moduleRunId,
        provider: provider.provider,
        modelName: model,
        artifactKind,
        artifacts: artifactsForSave,
        promptText,
        promptHash,
        parameters: {
          schema_version: 'EF-11-V1',
          run_mode: runMode,
          provider_mode: provider.provider,
          concurrency,
        },
        resultPayload: manifest,
      });

      let idx = 0;
      for (const clip of manifest.clips) {
        if (clip.status === 'GENERATED') {
          clip.artifact_id = saved.artifactIds[idx] ?? null;
          idx += 1;
        }
      }

      const output = {
        module_code: 'EF-11',
        content_uuid: req.contentUuid,
        workflow_run_id: req.workflowRunId,
        module_run_id: req.moduleRunId,
        generation_id: saved.generationId,
        generation_type: 'VIDEO_SET',
        version_no: saved.versionNo,
        is_current: saved.isCurrent,
        provider: provider.provider,
        model_name: model,
        run_mode: runMode,
        total_shots: manifest.total_shots,
        succeeded_shots: manifest.succeeded_shots,
        failed_shots: manifest.failed_shots,
        filtered_shots: manifest.filtered_shots,
        total_duration_sec: manifest.total_duration_sec,
        artifact_ids: saved.artifactIds,
        video_set: manifest,
      };

      await this.moduleRun.finishModule(
        req.moduleRunId,
        true,
        output,
        null,
        null,
      );

      return {
        generationId: saved.generationId,
        contentUuid: req.contentUuid,
        workflowRunId: req.workflowRunId,
        moduleRunId: req.moduleRunId,
        provider: provider.provider,
        model,
        totalShots: manifest.total_shots,
        succeededShots: manifest.succeeded_shots,
        failedShots: manifest.failed_shots,
        filteredShots: manifest.filtered_shots,
        artifacts: results,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        await this.moduleRun.finishModule(
          req.moduleRunId,
          false,
          {
            module_code: 'EF-11',
            content_uuid: req.contentUuid,
            workflow_run_id: req.workflowRunId,
            module_run_id: req.moduleRunId,
            video_status: 'FAILED',
            run_mode: runMode,
          },
          'EF11_VIDEO_GENERATION_FAILED',
          message.slice(0, 2000),
        );
      } catch {}
      throw error;
    }
  }

  private async processShot(
    source: Ef11VideoSource,
    shot: VideoShotInput,
    model: string,
    durationSec: number,
    provider: ReturnType<VideoProviderSelector['select']>,
    moduleRunId: string,
  ): Promise<ShotVideoArtifact> {
    const promptText = buildVideoPrompt(shot);
    const base: ShotVideoArtifact = {
      shotId: shot.shotId,
      sceneOrder: shot.sceneOrder,
      shotOrder: shot.shotOrder,
      status: 'FAILED',
      durationSec,
      promptText,
    };

    try {
      // image-to-video 입력 이미지 로드 (있으면)
      let imageBytes: Buffer | undefined;
      let imageMimeType: string | undefined;
      if (shot.imageStorageBucket && shot.imageStoragePath) {
        const img = await this.repo.downloadImage(
          shot.imageStorageBucket,
          shot.imageStoragePath,
        );
        if (img) {
          imageBytes = img.bytes;
          imageMimeType = img.mimeType;
        }
      }

      const produced = await provider.generate({
        model,
        prompt: promptText,
        aspectRatio: source.aspectRatio,
        durationSec,
        imageBytes,
        imageMimeType,
      });

      const stored = await this.storage.store({
        projectCode: source.projectCode,
        contentUuid: source.contentUuid,
        moduleRunId,
        shotId: shot.shotId,
        video: produced.video,
        mimeType: produced.mimeType,
        extension: produced.extension,
      });

      return {
        ...base,
        status: 'GENERATED',
        storage: stored,
        durationSec: produced.durationSec,
      };
    } catch (error) {
      const err = error as Error & { raiFilteredReason?: string };
      if (err.raiFilteredReason) {
        this.logger.warn(
          `EF-11 shot ${shot.shotId} FILTERED: ${err.raiFilteredReason}`,
        );
        return {
          ...base,
          status: 'FILTERED',
          raiFilteredReason: err.raiFilteredReason,
        };
      }
      this.logger.error(
        `EF-11 shot ${shot.shotId} FAILED: ${err.message ?? String(error)}`,
      );
      return {
        ...base,
        status: 'FAILED',
        errorMessage: (err.message ?? String(error)).slice(0, 500),
      };
    }
  }

  private async mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    worker: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    const results = new Array<R>(items.length);
    let cursor = 0;
    const runners = new Array(Math.min(limit, items.length))
      .fill(null)
      .map(async () => {
        for (;;) {
          const current = cursor;
          cursor += 1;
          if (current >= items.length) break;
          results[current] = await worker(items[current], current);
        }
      });
    await Promise.all(runners);
    return results;
  }
}
