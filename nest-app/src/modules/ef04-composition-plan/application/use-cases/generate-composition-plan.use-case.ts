import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ModuleRunService } from '../../../../common/workflow/module-run/module-run.service';
import { EventBusService } from '../../../../common/events/event-bus.service';
import { CompositionPlanGeneratedEvent } from '../../../../common/events/events/composition-plan-generated.event';

import { CompositionPlanRepository } from '../../domain/repositories/composition-plan.repository';
import { CompositionPlanGenerator } from '../../domain/services/composition-plan-generator.service';
import { CompositionPlanValidatorService } from '../../domain/services/composition-plan-validator.service';
import { CompositionPlanNormalizerService } from '../../domain/services/composition-plan-normalizer.service';
import { CompositionPlan } from '../../domain/entities/composition-plan.entity';

export interface GenerateCompositionPlanRequest {
  contentUuid: string;
  workflowRunId: string;
  moduleRunId: string;
  runMode?: string;
  expectedContentId?: string;
}

export interface GenerateCompositionPlanResult {
  moduleCode: 'EF-04';
  status: 'SUCCEEDED';
  contentUuid: string;
  workflowRunId: string;
  moduleRunId: string;
  compositionPlan: CompositionPlan;
  saved: unknown;
}

@Injectable()
export class GenerateCompositionPlanUseCase {
  constructor(
    private readonly repository:
      CompositionPlanRepository,

    private readonly generator:
      CompositionPlanGenerator,

    private readonly normalizer:
      CompositionPlanNormalizerService,

    private readonly validator:
      CompositionPlanValidatorService,

    private readonly moduleRunService:
      ModuleRunService,

    private readonly eventBus:
      EventBusService,

    private readonly config:
      ConfigService,
  ) {}

  async execute(
    request: GenerateCompositionPlanRequest,
  ): Promise<GenerateCompositionPlanResult> {
    await this.moduleRunService.beginModule(
      request.moduleRunId,
    );

    try {
      const lyrics =
        await this.repository.getLyrics(
          request.contentUuid,
        );

      const musicSpec =
        await this.repository.getMusicSpec(
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
        (
          request.runMode ??
          'TEST'
        )
          .trim()
          .toUpperCase();

      const generated =
        await this.generator.generate(
          lyrics,
          musicSpec,
          runMode,
        );

      const normalizedData =
        this.normalizer.normalize(
          generated.data,
          lyrics,
          musicSpec,
        );

      const generationModel =
        typeof generated
          .generationInfo
          .model === 'string'
          ? generated
              .generationInfo
              .model as string
          : undefined;

      const promptVersion =
        this.config.get<string>(
          'EF04_PROMPT_VERSION',
        ) ??
        'EF-COMPOSITION-PLAN-GOOGLE-V1';

      const compositionPlan =
        this.validator.create(
          normalizedData,
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

          lyrics,

          musicSpec,

          compositionPlan,

          generationInfo:
            generated.generationInfo,
        });

      await this.moduleRunService.finishModule(
        request.moduleRunId,
        true,
        {
          module_code:
            'EF-04',

          content_id:
            metadata.contentId,

          content_uuid:
            metadata.contentUuid,

          workflow_run_id:
            request.workflowRunId,

          module_run_id:
            request.moduleRunId,

          composition_plan_status:
            'READY',

          title_ko:
            compositionPlan.titleKo,

          bpm:
            compositionPlan.bpm,

          musical_key:
            compositionPlan.musicalKey,

          target_duration_sec:
            compositionPlan.targetDurationSec,

          generation_model:
            generationModel,

          saved_composition_plan_id:
            (
              saved &&
              typeof saved === 'object' &&
              'id' in saved
            )
              ? (
                  saved as {
                    id?: unknown;
                  }
                ).id ?? null
              : null,
        },
        null,
        null,
      );

      await this.eventBus.publish(
        new CompositionPlanGeneratedEvent(
          request.workflowRunId,
          request.moduleRunId,
          request.contentUuid,
          {
            status:
              'READY',

            titleKo:
              compositionPlan.titleKo,

            bpm:
              compositionPlan.bpm,

            musicalKey:
              compositionPlan.musicalKey,

            targetDurationSec:
              compositionPlan.targetDurationSec,

            generationModel,
          },
        ),
      );

      return {
        moduleCode:
          'EF-04',

        status:
          'SUCCEEDED',

        contentUuid:
          request.contentUuid,

        workflowRunId:
          request.workflowRunId,

        moduleRunId:
          request.moduleRunId,

        compositionPlan,

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
            module_code:
              'EF-04',

            content_id:
              request.expectedContentId ??
              null,

            content_uuid:
              request.contentUuid,

            workflow_run_id:
              request.workflowRunId,

            module_run_id:
              request.moduleRunId,

            composition_plan_status:
              'FAILED',
          },

          'EF04_EXECUTION_FAILED',

          message.substring(
            0,
            2000,
          ),
        );
      } catch {
        // Preserve original error.
      }

      throw error;
    }
  }
}
