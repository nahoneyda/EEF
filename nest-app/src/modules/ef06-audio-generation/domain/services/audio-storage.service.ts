import { StoredAudioObject } from '../entities/audio-generation.entity';
export interface StoreAudioInput {
  projectCode: string;
  contentUuid: string;
  moduleRunId: string;
  audio: Buffer;
  mimeType: string;
  extension: string;
}
export abstract class AudioStorage {
  abstract store(input: StoreAudioInput): Promise<StoredAudioObject>;
}
