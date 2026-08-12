import {
  VideoSetManifest,
  VideoShotInput,
} from '../entities/video-generation.entity';

export interface Ef11VideoSource {
  contentUuid: string;
  projectId: string;
  projectCode: string;
  storyboardGenerationId: string;
  imageSetGenerationId: string;
  title: string;
  aspectRatio: string;
  shots: VideoShotInput[];
}

export interface SavedVideoArtifactInput {
  shotId: string;
  artifactName: string;
  storageBucket: string;
  storagePath: string;
  publicUrl?: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256?: string;
  durationSec: number;
  metadata?: Record<string, unknown>;
}

export interface SaveVideoSetInput {
  contentUuid: string;
  moduleRunId: string;
  provider: string;
  modelName: string;
  artifactKind: string;
  artifacts: SavedVideoArtifactInput[];
  promptText: string;
  promptHash: string;
  parameters: Record<string, unknown>;
  resultPayload: VideoSetManifest;
}

export interface SavedVideoSet {
  generationId: string;
  versionNo: number;
  isCurrent: boolean;
  createdAt: string;
  artifactIds: string[];
}

export abstract class VideoGenerationRepository {
  abstract loadSource(contentUuid: string): Promise<Ef11VideoSource>;
  abstract saveVideoSet(input: SaveVideoSetInput): Promise<SavedVideoSet>;
  /** image-to-video 입력 이미지 바이트를 Storage 에서 가져온다 */
  abstract downloadImage(
    bucket: string,
    path: string,
  ): Promise<{ bytes: Buffer; mimeType: string } | null>;
}
