import { Injectable } from '@nestjs/common';

import {
  Ef04LyricsData,
  Ef04MusicSpecData,
} from '../repositories/composition-plan.repository';

@Injectable()
export class CompositionPlanNormalizerService {
  normalize(
    generated: Record<string, unknown>,
    lyrics: Ef04LyricsData,
    musicSpec: Ef04MusicSpecData,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {
      ...generated,
      title_ko: lyrics.titleKo,
      title_en: lyrics.titleEn ?? '',
      language: lyrics.language || 'ko',
      target_duration_sec: musicSpec.targetDurationSec,
      bpm: musicSpec.bpm,
      musical_key: musicSpec.musicalKey,
      time_signature: musicSpec.timeSignature,
    };

    result.hook_strategy =
      this.normalizeHookStrategy(
        generated.hook_strategy,
        lyrics.hookLine,
      );

    const normalizedStructure =
      this.normalizeSongStructure(
        generated.song_structure,
        musicSpec.targetDurationSec,
      );

    result.song_structure =
      normalizedStructure;

    result.section_timing =
      this.buildSectionTiming(
        normalizedStructure,
      );

    return result;
  }

  private normalizeHookStrategy(
    value: unknown,
    canonicalHook: string,
  ): Record<string, unknown> {
    const current =
      this.objectValue(value);

    return {
      ...current,
      lyrical_hook:
        canonicalHook.trim(),
    };
  }

  private normalizeSongStructure(
    value: unknown,
    targetDurationSec: number,
  ): Array<Record<string, unknown>> {
    if (
      !Array.isArray(value) ||
      value.length === 0
    ) {
      throw new Error(
        'song_structure must be a non-empty array before normalization',
      );
    }

    const rows =
      value.map(
        (item, index) => {
          const source =
            this.objectValue(item);

          const rawDuration =
            Number(
              source.target_sec,
            );

          if (
            !Number.isFinite(
              rawDuration,
            ) ||
            rawDuration <= 0
          ) {
            throw new Error(
              `song_structure[${index}].target_sec must be positive`,
            );
          }

          return {
            ...source,
            target_sec:
              rawDuration,
          };
        },
      );

    const currentTotal =
      rows.reduce(
        (sum, row) =>
          sum +
          Number(
            row.target_sec,
          ),
        0,
      );

    if (
      !Number.isFinite(
        currentTotal,
      ) ||
      currentTotal <= 0
    ) {
      throw new Error(
        'song_structure total duration is invalid',
      );
    }

    const ratio =
      targetDurationSec /
      currentTotal;

    const normalized =
      rows.map(
        (row) => ({
          ...row,
          target_sec:
            Math.max(
              1,
              Math.round(
                Number(
                  row.target_sec,
                ) * ratio,
              ),
            ),
        }),
      );

    let total =
      normalized.reduce(
        (sum, row) =>
          sum +
          Number(
            row.target_sec,
          ),
        0,
      );

    let delta =
      targetDurationSec -
      total;

    /**
     * Rounding correction.
     * Adjust from the final section backwards while keeping each section >= 1 sec.
     */
    let index =
      normalized.length - 1;

    while (
      delta !== 0 &&
      normalized.length > 0
    ) {
      const row =
        normalized[index];

      const current =
        Number(
          row.target_sec,
        );

      if (delta > 0) {
        row.target_sec =
          current + 1;

        delta -= 1;
      } else if (
        current > 1
      ) {
        row.target_sec =
          current - 1;

        delta += 1;
      }

      index -= 1;

      if (index < 0) {
        index =
          normalized.length -
          1;
      }
    }

    total =
      normalized.reduce(
        (sum, row) =>
          sum +
          Number(
            row.target_sec,
          ),
        0,
      );

    if (
      total !==
      targetDurationSec
    ) {
      throw new Error(
        `Unable to normalize song duration: target=${targetDurationSec} actual=${total}`,
      );
    }

    return normalized;
  }

  private buildSectionTiming(
    structure:
      Array<Record<string, unknown>>,
  ): Record<string, number> {
    const timing:
      Record<string, number> =
      {};

    for (
      const row
      of structure
    ) {
      const section =
        typeof row.section ===
          'string'
          ? row.section.trim()
          : '';

      const targetSec =
        Number(
          row.target_sec,
        );

      if (
        section &&
        Number.isFinite(
          targetSec,
        )
      ) {
        timing[section] =
          targetSec;
      }
    }

    return timing;
  }

  private objectValue(
    value: unknown,
  ): Record<string, unknown> {
    if (
      value &&
      typeof value ===
        'object' &&
      !Array.isArray(value)
    ) {
      return value as Record<
        string,
        unknown
      >;
    }

    return {};
  }
}
