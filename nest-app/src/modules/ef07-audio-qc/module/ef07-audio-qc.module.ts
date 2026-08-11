import { Module } from '@nestjs/common';
import { WorkflowModule } from '../../../common/workflow/workflow.module';
import { ReviewAudioUseCase } from '../application/use-cases/review-audio.use-case';
import { AudioReviewRepository } from '../domain/repositories/audio-review.repository';
import { AudioAnalyzer } from '../domain/services/audio-analyzer.service';
import { AudioQcPolicy } from '../domain/services/audio-qc-policy.service';
import { SupabaseAudioReviewRepository } from '../infrastructure/supabase-audio-review.repository';
import { FfmpegAudioAnalyzer } from '../infrastructure/ffmpeg-audio-analyzer.service';

@Module({
  imports: [WorkflowModule],
  providers: [
    ReviewAudioUseCase,
    AudioQcPolicy,
    { provide: AudioReviewRepository, useClass: SupabaseAudioReviewRepository },
    { provide: AudioAnalyzer, useClass: FfmpegAudioAnalyzer },
  ],
  exports: [ReviewAudioUseCase],
})
export class Ef07AudioQcModule {}
