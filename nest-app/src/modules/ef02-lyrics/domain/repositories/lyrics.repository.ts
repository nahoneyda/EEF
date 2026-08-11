import { Lyrics } from '../entities/lyrics.entity';

export interface ContentMetadata {
  contentUuid: string;
  contentId: string;
  projectId: string;
  projectCode: string;
  projectName?: string;
}

export interface Ef01ContextData {
  language: string;
  genre: string;
  theme: string;
  mood: string[];
  targetAudience: string;
  vocalStyle: string;
  targetDurationSeconds: number;
  tempoBpm: number;
  instrumentStyle: string;
  arrangementStyle: string;
  mixStyle: string;
  masterStyle: string;
  musicalKey: string;
  timeSignature: string;
  videoStyle: string;
  aspectRatio: string;
  contextStatus: 'READY';
}

export interface SaveLyricsInput {
  workflowRunId: string;
  moduleRunId: string;
  metadata: ContentMetadata;
  context: Ef01ContextData;
  lyrics: Lyrics;
  generationInfo?: Record<string, unknown>;
}

export interface SavedLyrics {
  id?: string;
  contentUuid?: string;
  contentId?: string;
  lyricsStatus?: string;
  raw?: unknown;
}

export abstract class LyricsRepository {
  abstract getContext(
    contentUuid: string,
  ): Promise<Ef01ContextData>;

  abstract getContentMetadata(
    contentUuid: string,
  ): Promise<ContentMetadata>;

  abstract save(
    input: SaveLyricsInput,
  ): Promise<SavedLyrics>;

  abstract findByContentUuid(
    contentUuid: string,
  ): Promise<Lyrics | null>;
}
