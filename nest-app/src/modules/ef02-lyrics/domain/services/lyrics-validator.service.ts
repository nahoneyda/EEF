import { Injectable } from '@nestjs/common';

import {
  LYRIC_SECTION_NAMES,
  Lyrics,
  LyricsProps,
  LyricsSections,
} from '../entities/lyrics.entity';

@Injectable()
export class LyricsValidatorService {
  create(
    value: Record<string, unknown>,
    options?: {
      generationModel?: string;
      promptVersion?: string;
    },
  ): Lyrics {
    const titleKo =
      this.requiredString(
        value.title_ko,
        'title_ko',
      );

    const titleEn =
      this.requiredString(
        value.title_en,
        'title_en',
      );

    const concept =
      this.requiredString(
        value.concept,
        'concept',
      );

    const hookLine =
      this.requiredString(
        value.hook_line,
        'hook_line',
      );

    const lyrics =
      this.parseLyrics(value.lyrics);

    const lyricKeywords =
      this.requiredStringArray(
        value.lyric_keywords,
        'lyric_keywords',
      );

    const language =
      this.requiredString(
        value.language,
        'language',
      );

    if (language !== 'ko') {
      throw new Error(
        `EF-02 language must be ko: ${language}`,
      );
    }

    const props: LyricsProps = {
      titleKo,
      titleEn,
      concept,
      hookLine,
      lyrics,
      lyricKeywords,
      language: 'ko',
      lyricsStatus: 'READY',
      generationModel:
        options?.generationModel,
      promptVersion:
        options?.promptVersion,
    };

    return new Lyrics(props);
  }

  private parseLyrics(
    value: unknown,
  ): LyricsSections {
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value)
    ) {
      throw new Error(
        'lyrics must be a JSON object',
      );
    }

    const source =
      value as Record<string, unknown>;

    const result =
      {} as LyricsSections;

    for (const section of LYRIC_SECTION_NAMES) {
      result[section] =
        this.requiredString(
          source[section],
          `lyrics.${section}`,
        );
    }

    return result;
  }

  private requiredString(
    value: unknown,
    fieldName: string,
  ): string {
    if (typeof value !== 'string') {
      throw new Error(
        `${fieldName} must be a string`,
      );
    }

    const normalized = value.trim();

    if (!normalized) {
      throw new Error(
        `${fieldName} must not be empty`,
      );
    }

    return normalized;
  }

  private requiredStringArray(
    value: unknown,
    fieldName: string,
  ): string[] {
    if (!Array.isArray(value)) {
      throw new Error(
        `${fieldName} must be an array`,
      );
    }

    const normalized =
      value
        .map(
          (item) =>
            typeof item === 'string'
              ? item.trim()
              : '',
        )
        .filter(Boolean);

    if (normalized.length === 0) {
      throw new Error(
        `${fieldName} must contain at least one item`,
      );
    }

    return normalized;
  }
}
