import {
  Ef02LyricsData,
  Ef03ContextData,
} from '../repositories/music-spec.repository';

export interface MusicSpecGenerationResult {
  data: Record<string, unknown>;
  generationInfo: Record<string, unknown>;
}

export abstract class MusicSpecGenerator {
  abstract generate(
    context: Ef03ContextData,
    lyrics: Ef02LyricsData,
    runMode: string,
  ): Promise<MusicSpecGenerationResult>;
}
