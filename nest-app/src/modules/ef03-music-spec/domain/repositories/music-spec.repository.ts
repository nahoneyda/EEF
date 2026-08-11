import { MusicSpec } from '../entities/music-spec.entity';

export interface Ef03ContextData {
  language: string;
  genre: string;
  theme: string;
  mood: string[];
  targetAudience: string;
  vocalStyle: string;
  targetDurationSeconds: number;
  tempoBpm: number;
  musicalKey: string;
  timeSignature: string;
}

export interface Ef02LyricsData {
  titleKo: string;
  titleEn?: string;
  concept: string;
  hookLine: string;
  lyrics: Record<string, string>;
  lyricKeywords: string[];
  language: string;
}

export interface Ef03ContentMetadata {
  contentUuid: string;
  contentId: string;
  projectId: string;
  projectCode: string;
}

export interface SaveMusicSpecInput {
  workflowRunId: string;
  moduleRunId: string;
  metadata: Ef03ContentMetadata;
  context: Ef03ContextData;
  lyrics: Ef02LyricsData;
  musicSpec: MusicSpec;
  generationInfo?: Record<string, unknown>;
}

export interface SavedMusicSpec {
  id?: string;
  contentUuid?: string;
  status?: string;
  raw?: unknown;
}

export abstract class MusicSpecRepository {
  abstract getContext(
    contentUuid: string,
  ): Promise<Ef03ContextData>;

  abstract getLyrics(
    contentUuid: string,
  ): Promise<Ef02LyricsData>;

  abstract getContentMetadata(
    contentUuid: string,
  ): Promise<Ef03ContentMetadata>;

  abstract save(
    input: SaveMusicSpecInput,
  ): Promise<SavedMusicSpec>;
}
