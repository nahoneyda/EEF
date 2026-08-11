import {
  AudioGenerationSource,
  AudioQcResult,
  AudioTechnicalAnalysis,
  SavedReview,
} from '../entities/audio-review.entity';

export abstract class AudioReviewRepository {
  abstract getLatestCompletedAudio(
    contentUuid: string,
  ): Promise<AudioGenerationSource>;
  abstract downloadAudio(source: AudioGenerationSource): Promise<Buffer>;
  abstract upsertAutomaticReview(input: {
    contentUuid: string;
    result: AudioQcResult;
    analysis: AudioTechnicalAnalysis;
    source: AudioGenerationSource;
    runMode: string;
  }): Promise<SavedReview>;
  abstract upsertFatalReview(input: {
    contentUuid: string;
    runMode: string;
    errorCode: string;
    errorMessage: string;
  }): Promise<SavedReview>;
}
