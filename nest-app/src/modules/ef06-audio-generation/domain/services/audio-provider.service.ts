import { AudioProviderResult } from '../entities/audio-generation.entity';
export interface GenerateAudioProviderInput {
  model: string;
  prompt: string;
  outputFormat: string;
}
export abstract class AudioProvider {
  abstract readonly provider: string;
  abstract generate(input: GenerateAudioProviderInput): Promise<AudioProviderResult>;
}
