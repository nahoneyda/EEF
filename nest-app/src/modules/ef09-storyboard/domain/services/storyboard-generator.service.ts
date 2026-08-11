import { Storyboard } from '../entities/storyboard.entity';
import { StoryboardSources } from '../repositories/storyboard.repository';

export interface StoryboardGenerationResult {
  data: Storyboard;
  promptText: string;
  parameters: Record<string, unknown>;
  generationInfo: {
    provider: string;
    model: string;
    usage: Record<string, unknown>;
  };
}

export abstract class StoryboardGenerator {
  abstract generate(
    sources: StoryboardSources,
    runMode: string,
  ): Promise<StoryboardGenerationResult>;
}
