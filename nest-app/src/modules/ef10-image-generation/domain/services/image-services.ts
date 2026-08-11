import {
  ImageProviderResult,
  StoredImageObject,
} from '../entities/image-generation.entity';

export interface GenerateImageProviderInput {
  model: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  outputMimeType: string;
}

export abstract class ImageProvider {
  abstract readonly provider: string;
  abstract generate(
    input: GenerateImageProviderInput,
  ): Promise<ImageProviderResult>;
}

export interface StoreImageInput {
  projectCode: string;
  contentUuid: string;
  moduleRunId: string;
  shotId: string;
  image: Buffer;
  mimeType: string;
  extension: string;
}

export abstract class ImageStorage {
  abstract store(input: StoreImageInput): Promise<StoredImageObject>;
}
