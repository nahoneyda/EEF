import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { ModelRegistryService } from '../../../../common/ai/model-registry.service';
import { ModuleRunService } from '../../../../common/workflow/module-run/module-run.service';
import {
  ImageGenerationResult,
  ImageSetManifest,
  ShotImageArtifact,
  StoryboardShotInput,
} from '../../domain/entities/image-generation.entity';
import {
  ImageGenerationRepository,
  SavedArtifactInput,
} from '../../domain/repositories/image-generation.repository';
import {
  ImageProvider,
  ImageStorage,
} from '../../domain/services/image-services';
import { buildImagePrompt, buildNegativePrompt } from './build-image-prompt';

@Injectable()
export class GenerateImagesUseCase {
  private readonly logger = new Logger(GenerateImagesUseCase.name);

  constructor(
    private readonly repo: ImageGenerationRepository,
    private readonly provider: ImageProvider,
    private readonly storage: ImageStorage,
    private readonly moduleRun: ModuleRunService,
    private readonly models: ModelRegistryService,
    private readonly config: ConfigService,
  ) {}

  async execute(req: {
    contentUuid: string;
    workflowRunId: string;
    moduleRunId: string;
    runMode?: string;
  }): Promise<ImageGenerationResult> {
    await this.moduleRun.beginModule(req.moduleRunId);
    const runMode = (req.runMode ?? 'TEST').trim().toUpperCase();
    const production = runMode === 'PRODUCTION';

    try {
      const source = await this.repo.loadStoryboard(req.contentUuid);

      const model =
        this.config.get<string>(
          production ? 'EF10_IMAGE_MODEL_PRODUCTION' : 'EF10_IMAGE_MODEL_TEST',
        ) ?? this.models.getGoogleModels(runMode).image;

      const artifactKind =
        this.config.get<string>('EF10_ARTIFACT_KIND') ?? 'IMAGE';
      const concurrency = Math.max(
        1,
        Number(this.config.get<string>('EF10_CONCURRENCY') ?? '3'),
      );
      const negativePrompt = buildNegativePrompt(source);

      // shot 단위 병렬(동시성 제한) 처리. shot 실패는 격리하여 나머지 저장.
      const results = await this.mapWithConcurrency(
        source.shots,
        concurrency,
        (shot) =>
          this.processShot(
            source,
            shot,
            model,
            negativePrompt,
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
          `EF-10 produced no images (filtered=${filtered.length}, failed=${failed.length}); first reason: ${firstReason}`,
        );
      }

      const artifactsForSave: SavedArtifactInput[] = succeeded.map((r) => ({
        shotId: r.shotId,
        artifactName: r.shotId,
        storageBucket: r.storage!.bucket,
        storagePath: r.storage!.path,
        publicUrl: r.storage!.publicUrl,
        mimeType: r.storage!.mimeType,
        sizeBytes: r.storage!.fileSizeBytes,
        checksumSha256: r.storage!.checksumSha256,
        metadata: {
          scene_order: r.sceneOrder,
          shot_order: r.shotOrder,
          prompt_text: r.promptText,
        },
      }));

      const manifest: ImageSetManifest = {
        schema_version: 'EF-10-V1',
        provider: this.provider.provider,
        model,
        aspect_ratio: source.aspectRatio,
        total_shots: results.length,
        succeeded_shots: succeeded.length,
        failed_shots: failed.length,
        filtered_shots: filtered.length,
        images: results.map((r) => ({
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
          rai_filtered_reason: r.raiFilteredReason ?? null,
        })),
      };

      const promptText = succeeded.map((r) => r.promptText).join('\n---\n');
      const promptHash = createHash('sha256')
        .update(promptText, 'utf8')
        .digest('hex');

      const saved = await this.repo.saveImageSet({
        contentUuid: req.contentUuid,
        moduleRunId: req.moduleRunId,
        provider: this.provider.provider,
        modelName: model,
        artifactKind,
        artifacts: artifactsForSave,
        promptText,
        promptHash,
        parameters: {
          schema_version: 'EF-10-V1',
          run_mode: runMode,
          concurrency,
          negative_prompt: negativePrompt,
        },
        resultPayload: manifest,
      });

      // 저장된 artifact_id 를 매니페스트 이미지에 역매핑 (성공 shot 순서 = artifactIds 순서)
      let idx = 0;
      for (const img of manifest.images) {
        if (img.status === 'GENERATED') {
          img.artifact_id = saved.artifactIds[idx] ?? null;
          idx += 1;
        }
      }

      const output = {
        module_code: 'EF-10',
        content_uuid: req.contentUuid,
        workflow_run_id: req.workflowRunId,
        module_run_id: req.moduleRunId,
        generation_id: saved.generationId,
        generation_type: 'IMAGE_SET',
        version_no: saved.versionNo,
        is_current: saved.isCurrent,
        provider: this.provider.provider,
        model_name: model,
        run_mode: runMode,
        total_shots: manifest.total_shots,
        succeeded_shots: manifest.succeeded_shots,
        failed_shots: manifest.failed_shots,
        filtered_shots: manifest.filtered_shots,
        artifact_ids: saved.artifactIds,
        image_set: manifest,
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
        provider: this.provider.provider,
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
            module_code: 'EF-10',
            content_uuid: req.contentUuid,
            workflow_run_id: req.workflowRunId,
            module_run_id: req.moduleRunId,
            image_status: 'FAILED',
            run_mode: runMode,
          },
          'EF10_IMAGE_GENERATION_FAILED',
          message.slice(0, 2000),
        );
      } catch {}
      throw error;
    }
  }

  private async processShot(
    source: Parameters<typeof buildImagePrompt>[0],
    shot: StoryboardShotInput,
    model: string,
    negativePrompt: string,
    moduleRunId: string,
  ): Promise<ShotImageArtifact> {
    const promptText = buildImagePrompt(source, shot);
    const base: ShotImageArtifact = {
      shotId: shot.shotId,
      sceneOrder: shot.sceneOrder,
      shotOrder: shot.shotOrder,
      status: 'FAILED',
      promptText,
    };

    try {
      const produced = await this.provider.generate({
        model,
        prompt: promptText,
        negativePrompt,
        aspectRatio: source.aspectRatio,
        outputMimeType: 'image/png',
      });

      const stored = await this.storage.store({
        projectCode: source.projectCode,
        contentUuid: source.contentUuid,
        moduleRunId,
        shotId: shot.shotId,
        image: produced.image,
        mimeType: produced.mimeType,
        extension: produced.extension,
      });

      return { ...base, status: 'GENERATED', storage: stored };
    } catch (error) {
      const err = error as Error & { raiFilteredReason?: string };
      if (err.raiFilteredReason) {
        this.logger.warn(
          `EF-10 shot ${shot.shotId} FILTERED: ${err.raiFilteredReason}`,
        );
        return {
          ...base,
          status: 'FILTERED',
          raiFilteredReason: err.raiFilteredReason,
        };
      }
      this.logger.error(
        `EF-10 shot ${shot.shotId} FAILED: ${err.message ?? String(error)}`,
      );
      return {
        ...base,
        status: 'FAILED',
        errorMessage: (err.message ?? String(error)).slice(0, 500),
      };
    }
  }

  /**
   * 동시성 제한 병렬 실행. 입력 순서를 보존해 결과 배열을 반환한다.
   */
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
