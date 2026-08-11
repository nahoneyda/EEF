import { CompositionPlan } from '../entities/composition-plan.entity';

export interface Ef04LyricsData {
  titleKo: string;
  titleEn: string;
  concept: string;
  hookLine: string;
  lyrics: Record<string, string>;
  lyricKeywords: string[];
  language: string;
}

export interface Ef04MusicSpecData {
  specVersion: string;
  genre: string;
  subgenre?: string;
  bpm: number;
  musicalKey: string;
  timeSignature: string;
  targetDurationSec: number;
  energy?: number;
  valence?: number;
  danceability?: number;
  mood: string[];
  instrumentation: Record<string, unknown>;
  vocalSpec: Record<string, unknown>;
  arrangement: Record<string, unknown>;
  productionStyle: Record<string, unknown>;
  generationConstraints: Record<string, unknown>;
}

export interface Ef04ContentMetadata {
  contentUuid: string;
  contentId: string;
  projectId: string;
  projectCode: string;
}

export interface SaveCompositionPlanInput {
  workflowRunId: string;
  moduleRunId: string;
  metadata: Ef04ContentMetadata;
  lyrics: Ef04LyricsData;
  musicSpec: Ef04MusicSpecData;
  compositionPlan: CompositionPlan;
  generationInfo?: Record<string, unknown>;
}

export interface SavedCompositionPlan {
  id?: string;
  contentUuid?: string;
  status?: string;
  raw?: unknown;
}

export abstract class CompositionPlanRepository {
  abstract getLyrics(
    contentUuid: string,
  ): Promise<Ef04LyricsData>;

  abstract getMusicSpec(
    contentUuid: string,
  ): Promise<Ef04MusicSpecData>;

  abstract getContentMetadata(
    contentUuid: string,
  ): Promise<Ef04ContentMetadata>;

  abstract save(
    input: SaveCompositionPlanInput,
  ): Promise<SavedCompositionPlan>;
}
