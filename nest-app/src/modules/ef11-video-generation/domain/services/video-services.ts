import {
  VideoProviderResult,
  StoredVideoObject,
} from '../entities/video-generation.entity';

export interface GenerateVideoProviderInput {
  model: string;
  prompt: string;
  aspectRatio: string;
  durationSec: number;
  /** image-to-video 입력 (없으면 text-to-video) */
  imageBytes?: Buffer;
  imageMimeType?: string;
}

export abstract class VideoProvider {
  abstract readonly provider: string;
  abstract generate(
    input: GenerateVideoProviderInput,
  ): Promise<VideoProviderResult>;
}

export interface StoreVideoInput {
  projectCode: string;
  contentUuid: string;
  moduleRunId: string;
  shotId: string;
  video: Buffer;
  mimeType: string;
  extension: string;
}

export abstract class VideoStorage {
  abstract store(input: StoreVideoInput): Promise<StoredVideoObject>;
}
