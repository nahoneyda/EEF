import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { ModuleRunService } from '../../../../common/workflow/module-run/module-run.service';
import { assertStoryboard } from '../../domain/entities/storyboard.entity';
import { StoryboardRepository } from '../../domain/repositories/storyboard.repository';
import { StoryboardGenerator } from '../../domain/services/storyboard-generator.service';

@Injectable()
export class GenerateStoryboardUseCase {
  constructor(
    private readonly repository: StoryboardRepository,
    private readonly generator: StoryboardGenerator,
    private readonly moduleRun: ModuleRunService,
  ) {}

  async execute(req: {
    contentUuid: string;
    workflowRunId: string;
    moduleRunId: string;
    runMode?: string;
  }): Promise<Record<string, unknown>> {
    await this.moduleRun.beginModule(req.moduleRunId);
    const runMode = (req.runMode ?? 'TEST').trim().toUpperCase();

    try {
      const sources = await this.repository.loadSources(req.contentUuid);
      const generated = await this.generator.generate(sources, runMode);
      assertStoryboard(generated.data as unknown as Record<string, unknown>);

      const promptHash = createHash('sha256')
        .update(generated.promptText, 'utf8')
        .digest('hex');

      const saved = await this.repository.saveVersion({
        contentUuid: req.contentUuid,
        moduleRunId: req.moduleRunId,
        provider: generated.generationInfo.provider,
        modelName: generated.generationInfo.model,
        promptText: generated.promptText,
        promptHash,
        parameters: {
          ...generated.parameters,
          usage: generated.generationInfo.usage,
          run_mode: runMode,
        },
        resultPayload: generated.data,
      });

      const output = {
        module_code: 'EF-09',
        content_uuid: req.contentUuid,
        workflow_run_id: req.workflowRunId,
        module_run_id: req.moduleRunId,
        generation_id: saved.generationId,
        generation_type: 'STORYBOARD',
        version_no: saved.versionNo,
        is_current: saved.isCurrent,
        provider: generated.generationInfo.provider,
        model_name: generated.generationInfo.model,
        run_mode: runMode,
        storyboard: generated.data,
      };

      await this.moduleRun.finishModule(
        req.moduleRunId,
        true,
        output,
        null,
        null,
      );
      return output;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        await this.moduleRun.finishModule(
          req.moduleRunId,
          false,
          {
            module_code: 'EF-09',
            content_uuid: req.contentUuid,
            workflow_run_id: req.workflowRunId,
            module_run_id: req.moduleRunId,
            generation_type: 'STORYBOARD',
            run_mode: runMode,
          },
          'EF09_STORYBOARD_FAILED',
          message.slice(0, 2000),
        );
      } catch {}
      throw error;
    }
  }
}
