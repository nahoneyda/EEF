import { Injectable } from '@nestjs/common';

import {
  ArrangementSpec,
  GenerationConstraintsSpec,
  InstrumentationSpec,
  MusicSpec,
  MusicSpecProps,
  ProductionStyleSpec,
  VocalSpec,
} from '../entities/music-spec.entity';

@Injectable()
export class MusicSpecValidatorService {
  create(
    value: Record<string, unknown>,
    options?: {
      modelProvider?: string;
      modelName?: string;
      promptVersion?: string;
    },
  ): MusicSpec {
    const props: MusicSpecProps = {
      genre: this.requiredString(value.genre, 'genre'),
      subgenre: this.optionalString(value.subgenre),
      bpm: this.numberInRange(value.bpm, 'bpm', 40, 220),
      musicalKey: this.requiredString(
        value.musical_key,
        'musical_key',
      ),
      timeSignature: this.requiredString(
        value.time_signature,
        'time_signature',
      ),
      targetDurationSec: this.numberInRange(
        value.target_duration_sec,
        'target_duration_sec',
        30,
        600,
      ),
      energy: this.optionalUnit(value.energy, 'energy'),
      valence: this.optionalUnit(value.valence, 'valence'),
      danceability: this.optionalUnit(
        value.danceability,
        'danceability',
      ),
      mood: this.requiredStringArray(value.mood, 'mood'),
      instrumentation: this.instrumentation(value.instrumentation),
      vocalSpec: this.vocalSpec(value.vocal_spec),
      arrangement: this.arrangement(value.arrangement),
      productionStyle: this.productionStyle(value.production_style),
      generationConstraints:
        this.generationConstraints(value.generation_constraints),
      status: 'READY',
      specVersion: 'v1.0',
      sourceModule: 'EF-03',
      modelProvider: options?.modelProvider,
      modelName: options?.modelName,
      promptVersion: options?.promptVersion,
    };

    return new MusicSpec(props);
  }

  private instrumentation(value: unknown): InstrumentationSpec {
    const o = this.object(value, 'instrumentation');
    return {
      primary: this.requiredStringArray(o.primary, 'instrumentation.primary'),
      secondary: this.requiredStringArray(
        o.secondary,
        'instrumentation.secondary',
        true,
      ),
      avoid: this.requiredStringArray(
        o.avoid,
        'instrumentation.avoid',
        true,
      ),
    };
  }

  private vocalSpec(value: unknown): VocalSpec {
    const o = this.object(value, 'vocal_spec');
    return {
      type: this.requiredString(o.type, 'vocal_spec.type'),
      genderCharacter: this.requiredString(
        o.gender_character,
        'vocal_spec.gender_character',
      ),
      ageCharacter: this.requiredString(
        o.age_character,
        'vocal_spec.age_character',
      ),
      tone: this.requiredString(o.tone, 'vocal_spec.tone'),
      range: this.requiredString(o.range, 'vocal_spec.range'),
      delivery: this.requiredString(
        o.delivery,
        'vocal_spec.delivery',
      ),
      vibrato: this.requiredString(
        o.vibrato,
        'vocal_spec.vibrato',
      ),
      harmony: this.requiredString(
        o.harmony,
        'vocal_spec.harmony',
      ),
    };
  }

  private arrangement(value: unknown): ArrangementSpec {
    const o = this.object(value, 'arrangement');
    return {
      intro: this.requiredString(o.intro, 'arrangement.intro'),
      verse: this.requiredString(o.verse, 'arrangement.verse'),
      preChorus: this.requiredString(
        o.pre_chorus,
        'arrangement.pre_chorus',
      ),
      chorus: this.requiredString(
        o.chorus,
        'arrangement.chorus',
      ),
      bridge: this.requiredString(
        o.bridge,
        'arrangement.bridge',
      ),
      finalChorus: this.requiredString(
        o.final_chorus,
        'arrangement.final_chorus',
      ),
      ending: this.requiredString(
        o.ending,
        'arrangement.ending',
      ),
    };
  }

  private productionStyle(value: unknown): ProductionStyleSpec {
    const o = this.object(value, 'production_style');
    return {
      overall: this.requiredString(
        o.overall,
        'production_style.overall',
      ),
      acousticRatio: this.numberInRange(
        o.acoustic_ratio,
        'production_style.acoustic_ratio',
        0,
        1,
      ),
      electronicRatio: this.numberInRange(
        o.electronic_ratio,
        'production_style.electronic_ratio',
        0,
        1,
      ),
      dynamicRange: this.requiredString(
        o.dynamic_range,
        'production_style.dynamic_range',
      ),
      mixCharacter: this.requiredString(
        o.mix_character,
        'production_style.mix_character',
      ),
      reverb: this.requiredString(
        o.reverb,
        'production_style.reverb',
      ),
      masteringCharacter: this.requiredString(
        o.mastering_character,
        'production_style.mastering_character',
      ),
    };
  }

  private generationConstraints(
    value: unknown,
  ): GenerationConstraintsSpec {
    const o = this.object(value, 'generation_constraints');
    return {
      mustPreserve: this.requiredStringArray(
        o.must_preserve,
        'generation_constraints.must_preserve',
      ),
      avoid: this.requiredStringArray(
        o.avoid,
        'generation_constraints.avoid',
        true,
      ),
    };
  }

  private object(
    value: unknown,
    field: string,
  ): Record<string, unknown> {
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value)
    ) {
      throw new Error(`${field} must be an object`);
    }
    return value as Record<string, unknown>;
  }

  private requiredString(
    value: unknown,
    field: string,
  ): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`${field} must be a non-empty string`);
    }
    return value.trim();
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim()
      ? value.trim()
      : undefined;
  }

  private requiredStringArray(
    value: unknown,
    field: string,
    allowEmpty = false,
  ): string[] {
    if (!Array.isArray(value)) {
      throw new Error(`${field} must be an array`);
    }
    const result = value
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean);
    if (!allowEmpty && result.length === 0) {
      throw new Error(`${field} must not be empty`);
    }
    return result;
  }

  private numberInRange(
    value: unknown,
    field: string,
    min: number,
    max: number,
  ): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max) {
      throw new Error(
        `${field} must be between ${min} and ${max}`,
      );
    }
    return n;
  }

  private optionalUnit(
    value: unknown,
    field: string,
  ): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    return this.numberInRange(value, field, 0, 1);
  }
}
