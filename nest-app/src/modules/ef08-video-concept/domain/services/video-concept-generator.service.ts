import { VideoConcept } from '../entities/video-concept.entity';
import { VideoConceptSources } from '../repositories/video-concept.repository';

export interface VideoConceptGenerationResult {
  data: VideoConcept;
  promptText: string;
  parameters: Record<string, unknown>;
  generationInfo: {
    provider: string;
    model: string;
    usage: Record<string, unknown>;
  };
}

export abstract class VideoConceptGenerator {
  abstract generate(
    sources: VideoConceptSources,
    runMode: string,
  ): Promise<VideoConceptGenerationResult>;
}
