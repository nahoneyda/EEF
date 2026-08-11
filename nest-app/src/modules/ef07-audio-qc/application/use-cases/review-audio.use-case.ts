import { Injectable } from '@nestjs/common';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { extname, join } from 'path';
import { ModuleRunService } from '../../../../common/workflow/module-run/module-run.service';
import { EventBusService } from '../../../../common/events/event-bus.service';
import { AudioReviewedEvent } from '../../../../common/events/events/audio-reviewed.event';
import { AudioReviewRepository } from '../../domain/repositories/audio-review.repository';
import { AudioAnalyzer } from '../../domain/services/audio-analyzer.service';
import { AudioQcPolicy } from '../../domain/services/audio-qc-policy.service';

@Injectable()
export class ReviewAudioUseCase {
  constructor(
    private readonly repo: AudioReviewRepository,
    private readonly analyzer: AudioAnalyzer,
    private readonly policy: AudioQcPolicy,
    private readonly moduleRun: ModuleRunService,
    private readonly events: EventBusService,
  ) {}

  async execute(req: { contentUuid: string; workflowRunId: string; moduleRunId: string; runMode?: string }) {
    await this.moduleRun.beginModule(req.moduleRunId);
    const runMode = (req.runMode ?? 'TEST').trim().toUpperCase();
    let tempDirectory: string | undefined;
    try {
      const source = await this.repo.getLatestCompletedAudio(req.contentUuid);
      const audio = await this.repo.downloadAudio(source);
      tempDirectory = await mkdtemp(join(tmpdir(), 'ef07-'));
      const extension = extname(source.storagePath) || `.${source.format ?? 'mp3'}`;
      const localPath = join(tempDirectory, `audio${extension}`);
      await writeFile(localPath, audio);
      const analysis = await this.analyzer.analyze(localPath);
      const result = this.policy.evaluate(analysis, source, runMode);
      const review = await this.repo.upsertAutomaticReview({ contentUuid: req.contentUuid, result, analysis, source, runMode });
      const output = {
        module_code: 'EF-07', content_uuid: req.contentUuid, workflow_run_id: req.workflowRunId,
        module_run_id: req.moduleRunId, review_id: review.id, review_round: 1,
        decision: result.decision, score: result.score, generation_id: source.id,
        issue_count: result.issues.length, run_mode: runMode,
      };
      await this.moduleRun.finishModule(req.moduleRunId, true, output, null, null);
      await this.events.publish(new AudioReviewedEvent(req.workflowRunId, req.moduleRunId, req.contentUuid, {
        reviewId: review.id, reviewRound: 1, decision: result.decision,
        score: result.score, generationId: source.id,
      }));
      return { ...output, analysis, issues: result.issues };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        const review = await this.repo.upsertFatalReview({
          contentUuid: req.contentUuid,
          runMode,
          errorCode: 'EF07_AUDIO_UNAVAILABLE_OR_UNREADABLE',
          errorMessage: message.slice(0, 2000),
        });
        const output = {
          module_code: 'EF-07', content_uuid: req.contentUuid, workflow_run_id: req.workflowRunId,
          module_run_id: req.moduleRunId, review_id: review.id, review_round: 1,
          decision: 'REJECTED' as const, score: 0, run_mode: runMode,
          error_code: 'EF07_AUDIO_UNAVAILABLE_OR_UNREADABLE',
        };
        await this.moduleRun.finishModule(req.moduleRunId, true, output, null, null);
        await this.events.publish(new AudioReviewedEvent(req.workflowRunId, req.moduleRunId, req.contentUuid, {
          reviewId: review.id, reviewRound: 1, decision: 'REJECTED', score: 0, generationId: 'unavailable',
        }));
        return output;
      } catch (saveError) {
        const saveMessage = saveError instanceof Error ? saveError.message : String(saveError);
        try {
          await this.moduleRun.finishModule(req.moduleRunId, false, {
            module_code: 'EF-07', content_uuid: req.contentUuid, workflow_run_id: req.workflowRunId,
            module_run_id: req.moduleRunId, decision: 'REJECTED', run_mode: runMode,
          }, 'EF07_AUDIO_QC_FAILED', `${message}; ${saveMessage}`.slice(0, 2000));
        } catch {}
        throw saveError;
      }
    } finally {
      if (tempDirectory) await rm(tempDirectory, { recursive: true, force: true });
    }
  }
}
