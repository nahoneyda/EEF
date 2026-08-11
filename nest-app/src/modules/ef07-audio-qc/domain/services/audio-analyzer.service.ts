import { AudioTechnicalAnalysis } from '../entities/audio-review.entity';

export abstract class AudioAnalyzer {
  abstract analyze(filePath: string): Promise<AudioTechnicalAnalysis>;
}
