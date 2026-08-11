export const LYRIC_SECTION_NAMES = [
  'verse_1',
  'pre_chorus_1',
  'chorus_1',
  'verse_2',
  'pre_chorus_2',
  'chorus_2',
  'bridge',
  'final_chorus',
  'outro',
] as const;

export type LyricSectionName =
  (typeof LYRIC_SECTION_NAMES)[number];

export type LyricsStatus =
  | 'READY'
  | 'FAILED';

export type LyricsSections =
  Record<LyricSectionName, string>;

export interface LyricsProps {
  titleKo: string;
  titleEn: string;
  concept: string;
  hookLine: string;
  lyrics: LyricsSections;
  lyricKeywords: string[];
  language: 'ko';
  lyricsStatus: LyricsStatus;
  generationModel?: string;
  promptVersion?: string;
}

export class Lyrics {
  readonly titleKo: string;
  readonly titleEn: string;
  readonly concept: string;
  readonly hookLine: string;
  readonly lyrics: LyricsSections;
  readonly lyricKeywords: string[];
  readonly language: 'ko';
  readonly lyricsStatus: LyricsStatus;
  readonly generationModel?: string;
  readonly promptVersion?: string;

  constructor(
    props: LyricsProps,
  ) {
    this.titleKo = props.titleKo.trim();
    this.titleEn = props.titleEn.trim();
    this.concept = props.concept.trim();
    this.hookLine = props.hookLine.trim();
    this.lyrics = { ...props.lyrics };
    this.lyricKeywords = [...props.lyricKeywords];
    this.language = props.language;
    this.lyricsStatus = props.lyricsStatus;
    this.generationModel = props.generationModel;
    this.promptVersion = props.promptVersion;
  }

  toPersistence(): Record<string, unknown> {
    return {
      title_ko: this.titleKo,
      title_en: this.titleEn,
      concept: this.concept,
      hook_line: this.hookLine,
      lyrics: this.lyrics,
      lyric_keywords: this.lyricKeywords,
      language: this.language,
      lyrics_status: this.lyricsStatus,
      generation_model: this.generationModel,
      prompt_version: this.promptVersion,
    };
  }
}
