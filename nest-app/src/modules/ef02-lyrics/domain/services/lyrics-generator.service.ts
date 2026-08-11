import { Ef01ContextData } from '../repositories/lyrics.repository';

export interface LyricsGenerationResult {
  data: Record<string, unknown>;
  generationInfo: Record<string, unknown>;
}

export abstract class LyricsGenerator {
  abstract generate(
    context: Ef01ContextData,
    runMode: string,
  ): Promise<LyricsGenerationResult>;
}
