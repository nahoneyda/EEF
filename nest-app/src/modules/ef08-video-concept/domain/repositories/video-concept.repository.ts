import { VideoConcept } from '../entities/video-concept.entity';

export interface VideoConceptSources {
  content: Record<string, unknown>;
  context: Record<string, unknown>;
  lyrics: Record<string, unknown>;
  musicSpec: Record<string, unknown>;
  compositionPlan: Record<string, unknown>;
  providerPackage: Record<string, unknown>;
  audioGeneration: Record<string, unknown>;
  audioReview: Record<string, unknown>;
}

export interface SaveVideoConceptInput {
  contentUuid: string;
  moduleRunId: string;
  provider: string;
  modelName: string;
  promptText: string;
  promptHash: string;
  parameters: Record<string, unknown>;
  resultPayload: VideoConcept;
}

export interface SavedVideoConceptVersion {
  generationId: string;
  versionNo: number;
  isCurrent: boolean;
  createdAt: string;
}

export abstract class VideoConceptRepository {
  abstract loadSources(contentUuid: string): Promise<VideoConceptSources>;
  abstract saveVersion(input: SaveVideoConceptInput): Promise<SavedVideoConceptVersion>;
}
