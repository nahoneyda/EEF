import { Injectable } from '@nestjs/common';

import {
  ProjectContext,
  ProjectContextProps,
} from '../entities/project-context.entity';

export type ContextSource = Record<string, unknown>;

@Injectable()
export class ContextBuilderService {
  build(source: ContextSource = {}): ProjectContext {
    const props: ProjectContextProps = {
      language: this.stringValue(source.language, 'ko'),

      genre: this.stringValue(source.genre, 'Korean Ballad'),

      theme: this.stringValue(
        source.theme,
        this.stringValue(source.title, '새로운 시작과 따뜻한 위로'),
      ),

      mood: this.stringArray(source.mood, ['따뜻함', '희망', '위로']),

      targetAudience: this.stringValue(
        source.target_audience,
        '한국의 중장년층',
      ),

      vocalStyle: this.stringValue(source.vocal_style, 'warm and emotional'),

      targetDurationSeconds: this.numberValue(
        source.target_duration_seconds,
        210,
      ),

      tempoBpm: this.numberValue(source.tempo_bpm, 76),

      instrumentStyle: this.stringValue(
        source.instrument_style,
        'acoustic guitar, piano, soft strings',
      ),

      arrangementStyle: this.stringValue(
        source.arrangement_style,
        'verse-pre-chorus-bridge-final',
      ),

      mixStyle: this.stringValue(
        source.mix_style,
        'warm, clear vocal, natural dynamics',
      ),

      masterStyle: this.stringValue(
        source.master_style,
        'streaming-ready balanced master',
      ),

      musicalKey: this.stringValue(source.musical_key, 'G Major'),

      timeSignature: this.stringValue(source.time_signature, '4/4'),

      videoStyle: this.stringValue(
        source.video_style,
        'cinematic Korean daily-life storytelling',
      ),

      aspectRatio: this.stringValue(source.aspect_ratio, '16:9'),

      contextStatus: 'READY',
    };

    return new ProjectContext(props);
  }

  private stringValue(value: unknown, fallback: string): string {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    return fallback;
  }

  private numberValue(value: unknown, fallback: number): number {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
      return fallback;
    }

    return number;
  }

  private stringArray(value: unknown, fallback: string[]): string[] {
    if (!Array.isArray(value)) {
      return [...fallback];
    }

    const result = value.map((item) => String(item).trim()).filter(Boolean);

    if (result.length === 0) {
      return [...fallback];
    }

    return result;
  }
}
