import {
  Ef04LyricsData,
  Ef04MusicSpecData,
} from '../repositories/composition-plan.repository';

export interface CompositionPlanGenerationResult {
  data: Record<string, unknown>;
  generationInfo: Record<string, unknown>;
}

export abstract class CompositionPlanGenerator {
  abstract generate(
    lyrics: Ef04LyricsData,
    musicSpec: Ef04MusicSpecData,
    runMode: string,
  ): Promise<CompositionPlanGenerationResult>;
}
