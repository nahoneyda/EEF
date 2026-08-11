import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ModuleRunService } from '../../../../common/workflow/module-run/module-run.service';
import { EventBusService } from '../../../../common/events/event-bus.service';
import { LyricsGeneratedEvent } from '../../../../common/events/events/lyrics-generated.event';

import { LyricsRepository } from '../../domain/repositories/lyrics.repository';
import { LyricsGenerator } from '../../domain/services/lyrics-generator.service';
import { LyricsValidatorService } from '../../domain/services/lyrics-validator.service';
import { Lyrics } from '../../domain/entities/lyrics.entity';

export interface GenerateLyricsRequest {
  contentUuid: string;
  workflowRunId: string;
  moduleRunId: string;
  runMode?: string;
  expectedContentId?: string;
}

export interface GenerateLyricsResult {
  moduleCode: 'EF-02';
  status: 'SUCCEEDED';
  contentUuid: string;
  workflowRunId: string;
  moduleRunId: string;
  lyrics: Lyrics;
  saved: unknown;
}

@Injectable()
export class GenerateLyricsUseCase {
  constructor(
    private readonly repository:
      LyricsRepository,
    private readonly generator:
      LyricsGenerator,
    private readonly validator:
      LyricsValidatorService,
    private readonly moduleRunService:
      ModuleRunService,
    private readonly eventBus:
      EventBusService,
    private readonly config:
      ConfigService,
  ) {}

  async execute(
    request: GenerateLyricsRequest,
  ): Promise<GenerateLyricsResult> {
    await this.moduleRunService.beginModule(
      request.moduleRunId,
    );

    try {
      const context =
        await this.repository.getContext(
          request.contentUuid,
        );

      const metadata =
        await this.repository.getContentMetadata(
          request.contentUuid,
        );

      if (
        request.expectedContentId &&
        request.expectedContentId !==
          metadata.contentId
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
          runMode,
        );

      const generationModel =
        typeof generated.generationInfo.model ===
          'string'
          ? generated.generationInfo.model as string
          : undefined;

      const promptVersion =
        this.config.get<string>(
          'EF02_PROMPT_VERSION',
        ) ??
        'EF-LYRICS-GOOGLE-V2';

      const lyrics =
        this.validator.create(
          generated.data,
          {
            generationModel,
            promptVersion,
          },
        );

      const saved =
        await this.repository.save({
          workflowRunId:
            request.workflowRunId,
          moduleRunId:
            request.moduleRunId,
          metadata,
          context,
          lyrics,
          generationInfo:
            generated.generationInfo,
        });

      await this.moduleRunService.finishModule(
        request.moduleRunId,
        true,
        {
          module_code: 'EF-02',
          content_id:
            metadata.contentId,
          content_uuid:
            metadata.contentUuid,
          workflow_run_id:
            request.workflowRunId,
          module_run_id:
            request.moduleRunId,
          lyrics_status:
            'READY',
          title_ko:
            lyrics.titleKo,
          generation_model:
            generationModel,
          saved_lyrics_id:
            saved.id ?? null,
        },
        null,
        null,
      );

      await this.eventBus.publish(
        new LyricsGeneratedEvent(
          request.workflowRunId,
          request.moduleRunId,
          request.contentUuid,
          {
            lyricsStatus: 'READY',
            titleKo:
              lyrics.titleKo,
            concept:
              lyrics.concept,
            hookLine:
              lyrics.hookLine,
            generationModel,
          },
        ),
      );

      return {
        moduleCode: 'EF-02',
        status: 'SUCCEEDED',
        contentUuid:
          request.contentUuid,
        workflowRunId:
          request.workflowRunId,
        moduleRunId:
          request.moduleRunId,
        lyrics,
        saved,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error);

      try {
        await this.moduleRunService.finishModule(
          request.moduleRunId,
          false,
          {
            module_code:
              'EF-02',
            content_id:
              request.expectedContentId ??
              null,
            content_uuid:
              request.contentUuid,
            workflow_run_id:
              request.workflowRunId,
            module_run_id:
              request.moduleRunId,
            lyrics_status:
              'FAILED',
          },
          'EF02_EXECUTION_FAILED',
          errorMessage.substring(
            0,
            2000,
          ),
        );
      } catch {
        // Preserve original business error.
      }

      throw error;
    }
  }
}
