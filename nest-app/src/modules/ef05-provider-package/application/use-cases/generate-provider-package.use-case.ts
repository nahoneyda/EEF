import { Injectable } from '@nestjs/common';
import { ModuleRunService } from '../../../../common/workflow/module-run/module-run.service';
import { EventBusService } from '../../../../common/events/event-bus.service';
import { ProviderPackageGeneratedEvent } from '../../../../common/events/events/provider-package-generated.event';
import { ProviderPackageRepository } from '../../domain/repositories/provider-package.repository';
import { ProviderAdapter } from '../../domain/services/provider-adapter.service';
import { ProviderPackage } from '../../domain/entities/provider-package.entity';

export interface GenerateProviderPackageRequest {
  contentUuid: string;
  workflowRunId: string;
  moduleRunId: string;
  runMode?: string;
  expectedContentId?: string;
}

export interface GenerateProviderPackageResult {
  moduleCode: 'EF-05';
  status: 'SUCCEEDED';
  contentUuid: string;
  workflowRunId: string;
  moduleRunId: string;
  providerPackage: ProviderPackage;
  saved: unknown;
}

@Injectable()
export class GenerateProviderPackageUseCase {
  constructor(
    private readonly repository: ProviderPackageRepository,
    private readonly adapter: ProviderAdapter,
    private readonly moduleRunService: ModuleRunService,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(
    request: GenerateProviderPackageRequest,
  ): Promise<GenerateProviderPackageResult> {
    await this.moduleRunService.beginModule(request.moduleRunId);

    try {
      const metadata = await this.repository.getContentMetadata(request.contentUuid);

      if (
        request.expectedContentId &&
        request.expectedContentId !== metadata.contentId
      ) {
        throw new Error(
          `contentId does not match contentUuid expected=${request.expectedContentId} actual=${metadata.contentId}`,
        );
      }

      const [lyrics, musicSpec, compositionPlan] = await Promise.all([
        this.repository.getLyrics(request.contentUuid),
        this.repository.getMusicSpec(request.contentUuid),
        this.repository.getCompositionPlan(request.contentUuid),
      ]);

      const providerPackage = this.adapter.build({
        workflowRunId: request.workflowRunId,
        moduleRunId: request.moduleRunId,
        metadata,
        lyrics,
        musicSpec,
        compositionPlan,
        runMode: (request.runMode ?? 'TEST').trim().toUpperCase(),
      });

      const saved = await this.repository.save(providerPackage);

      await this.moduleRunService.finishModule(
        request.moduleRunId,
        true,
        {
          module_code: 'EF-05',
          content_id: metadata.contentId,
          content_uuid: metadata.contentUuid,
          workflow_run_id: request.workflowRunId,
          module_run_id: request.moduleRunId,
          package_status: 'READY',
          provider: providerPackage.provider,
          provider_model: providerPackage.providerModel ?? null,
          package_version: providerPackage.packageVersion,
          output_audio_format: providerPackage.outputAudioFormat,
          saved_provider_package_id: saved.id ?? null,
        },
        null,
        null,
      );

      await this.eventBus.publish(
        new ProviderPackageGeneratedEvent(
          request.workflowRunId,
          request.moduleRunId,
          request.contentUuid,
          {
            status: 'READY',
            provider: providerPackage.provider,
            providerModel: providerPackage.providerModel,
            titleKo: providerPackage.titleKo,
            packageVersion: providerPackage.packageVersion,
            outputAudioFormat: providerPackage.outputAudioFormat,
          },
        ),
      );

      return {
        moduleCode: 'EF-05',
        status: 'SUCCEEDED',
        contentUuid: request.contentUuid,
        workflowRunId: request.workflowRunId,
        moduleRunId: request.moduleRunId,
        providerPackage,
        saved,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      try {
        await this.moduleRunService.finishModule(
          request.moduleRunId,
          false,
          {
            module_code: 'EF-05',
            content_id: request.expectedContentId ?? null,
            content_uuid: request.contentUuid,
            workflow_run_id: request.workflowRunId,
            module_run_id: request.moduleRunId,
            package_status: 'FAILED',
          },
          'EF05_EXECUTION_FAILED',
          message.substring(0, 2000),
        );
      } catch {}

      throw error;
    }
  }
}
