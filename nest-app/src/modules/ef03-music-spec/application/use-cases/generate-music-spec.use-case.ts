import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ModuleRunService } from '../../../../common/workflow/module-run/module-run.service';
import { EventBusService } from '../../../../common/events/event-bus.service';
import { MusicSpecGeneratedEvent } from '../../../../common/events/events/music-spec-generated.event';

import { MusicSpecRepository } from '../../domain/repositories/music-spec.repository';
import { MusicSpecGenerator } from '../../domain/services/music-spec-generator.service';
import { MusicSpecValidatorService } from '../../domain/services/music-spec-validator.service';
import { MusicSpec } from '../../domain/entities/music-spec.entity';

export interface GenerateMusicSpecRequest {
  contentUuid: string;
  workflowRunId: string;
  moduleRunId: string;
  runMode?: string;
  expectedContentId?: string;
}

export interface GenerateMusicSpecResult {
  moduleCode: 'EF-03';
  status: 'SUCCEEDED';
  contentUuid: string;
  workflowRunId: string;
  moduleRunId: string;
  musicSpec: MusicSpec;
  saved: unknown;
}

@Injectable()
export class GenerateMusicSpecUseCase {
  constructor(
    private readonly repository: MusicSpecRepository,
    private readonly generator: MusicSpecGenerator,
    private readonly validator: MusicSpecValidatorService,
    private readonly moduleRunService: ModuleRunService,
    private readonly eventBus: EventBusService,
    private readonly config: ConfigService,
  ) {}

  async execute(
    request: GenerateMusicSpecRequest,
  ): Promise<GenerateMusicSpecResult> {
    await this.moduleRunService.beginModule(
      request.moduleRunId,
    );

    try {
      const context =
        await this.repository.getContext(
          request.contentUuid,
        );

      const lyrics =
        await this.repository.getLyrics(
          request.contentUuid,
        );

      const metadata =
        await this.repository.getContentMetadata(
          request.contentUuid,
        );

      if (
        request.expectedContentId &&
        request.expectedContentId !== metadata.contentId
      ) {
        throw new Error(
          [
            'contentId does not match contentUuid',
            `expected=${request.expectedContentId}`,
            `actual=${metadata.contentId}`,
          ].join(' '),
        );
      }

      const runMode =
        (request.runMode ?? 'TEST')
          .trim()
          .toUpperCase();

      const generated =
        await this.generator.generate(
          context,
          lyrics,
          runMode,
        );

      const modelName =
        typeof generated.generationInfo.model === 'string'
          ? generated.generationInfo.model as string
          : undefined;

      const musicSpec =
        this.validator.create(
          generated.data,
          {
            modelProvider: 'google',
            modelName,
            promptVersion:
              this.config.get<string>(
                'EF03_PROMPT_VERSION',
              ) ?? 'EF-MUSIC-SPEC-GOOGLE-V1',
          },
        );

      const saved =
        await this.repository.save({
          workflowRunId: request.workflowRunId,
          moduleRunId: request.moduleRunId,
          metadata,
          context,
          lyrics,
          musicSpec,
          generationInfo:
            generated.generationInfo,
        });

      await this.moduleRunService.finishModule(
        request.moduleRunId,
        true,
        {
          module_code: 'EF-03',
          content_id: metadata.contentId,
          content_uuid: metadata.contentUuid,
          workflow_run_id: request.workflowRunId,
          module_run_id: request.moduleRunId,
          music_spec_status: 'READY',
          genre: musicSpec.genre,
          bpm: musicSpec.bpm,
          musical_key: musicSpec.musicalKey,
          generation_model: modelName,
          saved_music_spec_id:
            saved.id ?? null,
        },
        null,
        null,
      );

      await this.eventBus.publish(
        new MusicSpecGeneratedEvent(
          request.workflowRunId,
          request.moduleRunId,
          request.contentUuid,
          {
            status: 'READY',
            genre: musicSpec.genre,
            bpm: musicSpec.bpm,
            musicalKey: musicSpec.musicalKey,
            targetDurationSec:
              musicSpec.targetDurationSec,
            modelName,
          },
        ),
      );

      return {
        moduleCode: 'EF-03',
        status: 'SUCCEEDED',
        contentUuid: request.contentUuid,
        workflowRunId: request.workflowRunId,
        moduleRunId: request.moduleRunId,
        musicSpec,
        saved,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      try {
        await this.moduleRunService.finishModule(
          request.moduleRunId,
          false,
          {
            module_code: 'EF-03',
            content_id:
              request.expectedContentId ?? null,
            content_uuid: request.contentUuid,
            workflow_run_id: request.workflowRunId,
            module_run_id: request.moduleRunId,
            music_spec_status: 'FAILED',
          },
          'EF03_EXECUTION_FAILED',
          message.substring(0, 2000),
        );
      } catch {
        // Preserve original error.
      }

      throw error;
    }
  }
}
