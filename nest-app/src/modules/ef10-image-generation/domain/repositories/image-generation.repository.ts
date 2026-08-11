import {
  ImageSetManifest,
  StoryboardShotInput,
} from '../entities/image-generation.entity';

export interface Ef10StoryboardSource {
  contentUuid: string;
  projectId: string;
  projectCode: string;
  storyboardGenerationId: string;
  title: string;
  aspectRatio: string;
  globalStyle: Record<string, unknown>;
  shots: StoryboardShotInput[];
}

export interface SavedArtifactInput {
  shotId: string;
  artifactName: string;
  storageBucket: string;
  storagePath: string;
  publicUrl?: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256?: string;
  metadata?: Record<string, unknown>;
}

export interface SaveImageSetInput {
  contentUuid: string;
  moduleRunId: string;
  provider: string;
  modelName: string;
  artifactKind: string;
  artifacts: SavedArtifactInput[];
  promptText: string;
  promptHash: string;
  parameters: Record<string, unknown>;
  resultPayload: ImageSetManifest;
}

export interface SavedImageSet {
  generationId: string;
  versionNo: number;
  isCurrent: boolean;
  createdAt: string;
  artifactIds: string[];
}

export abstract class ImageGenerationRepository {
  abstract loadStoryboard(contentUuid: string): Promise<Ef10StoryboardSource>;
  abstract saveImageSet(input: SaveImageSetInput): Promise<SavedImageSet>;
}
