import { Storyboard } from '../entities/storyboard.entity';

export interface StoryboardSources {
  content: Record<string, unknown>;
  context: Record<string, unknown>;
  lyrics: Record<string, unknown>;
  musicSpec: Record<string, unknown>;
  videoConcept: Record<string, unknown>;
}

export interface SaveStoryboardInput {
  contentUuid: string;
  moduleRunId: string;
  provider: string;
  modelName: string;
  promptText: string;
  promptHash: string;
  parameters: Record<string, unknown>;
  resultPayload: Storyboard;
}

export interface SavedStoryboardVersion {
  generationId: string;
  versionNo: number;
  isCurrent: boolean;
  createdAt: string;
}

export abstract class StoryboardRepository {
  abstract loadSources(contentUuid: string): Promise<StoryboardSources>;
  abstract saveVersion(
    input: SaveStoryboardInput,
  ): Promise<SavedStoryboardVersion>;
}
