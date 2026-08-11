import { Injectable } from '@nestjs/common';

import {
  CompositionPlan,
  CompositionPlanProps,
  CompositionSection,
  HarmonyPlan,
  MelodyPlan,
  RhythmPlan,
  VocalPhrasingPlan,
  InstrumentCue,
  DynamicsPlan,
  TransitionPlan,
  HookStrategy,
} from '../entities/composition-plan.entity';

@Injectable()
export class CompositionPlanValidatorService {
  create(
    value: Record<string, unknown>,
    options?: {
      generationModel?: string;
      promptVersion?: string;
    },
  ): CompositionPlan {
    const props: CompositionPlanProps = {
      planVersion: 'v1.0',
      titleKo: this.requiredString(value.title_ko, 'title_ko'),
      titleEn: this.requiredString(value.title_en, 'title_en'),
      language: this.requiredString(value.language, 'language'),
      targetDurationSec: this.numberInRange(
        value.target_duration_sec,
        'target_duration_sec',
        30,
        600,
      ),
      bpm: this.numberInRange(value.bpm, 'bpm', 40, 220),
      musicalKey: this.requiredString(
        value.musical_key,
        'musical_key',
      ),
      timeSignature: this.requiredString(
        value.time_signature,
        'time_signature',
      ),

      songStructure: this.songStructure(value.song_structure),
      sectionTiming: this.numberRecord(
        value.section_timing,
        'section_timing',
      ),
      harmonyPlan: this.harmonyPlan(value.harmony_plan),
      melodyPlan: this.melodyPlan(value.melody_plan),
      rhythmPlan: this.rhythmPlan(value.rhythm_plan),
      vocalPhrasingPlan:
        this.vocalPhrasingPlan(value.vocal_phrasing_plan),
      instrumentationCues:
        this.instrumentationCues(value.instrumentation_cues),
      dynamicsPlan: this.dynamicsPlan(value.dynamics_plan),
      transitionPlan: this.transitionPlan(value.transition_plan),
      hookStrategy: this.hookStrategy(value.hook_strategy),
      generationConstraints:
        this.generationConstraints(value.generation_constraints),

      planStatus: 'READY',
      generationModel: options?.generationModel,
      promptVersion: options?.promptVersion,
      sourceModule: 'EF-04',
    };

    return new CompositionPlan(props);
  }

  private songStructure(
    value: unknown,
  ): CompositionSection[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error('song_structure must be a non-empty array');
    }

    return value.map((item, index) => {
      const o = this.object(item, `song_structure[${index}]`);
      return {
        section: this.requiredString(
          o.section,
          `song_structure[${index}].section`,
        ),
        order: this.numberInRange(
          o.order,
          `song_structure[${index}].order`,
          1,
          100,
        ),
        targetSec: this.numberInRange(
          o.target_sec,
          `song_structure[${index}].target_sec`,
          1,
          600,
        ),
        purpose: this.requiredString(
          o.purpose,
          `song_structure[${index}].purpose`,
        ),
      };
    });
  }

  private harmonyPlan(value: unknown): HarmonyPlan {
    const o = this.object(value, 'harmony_plan');
    return {
      tonalCenter: this.requiredString(
        o.tonal_center,
        'harmony_plan.tonal_center',
      ),
      progressionDirection: this.requiredStringArray(
        o.progression_direction,
        'harmony_plan.progression_direction',
      ),
      cadenceStrategy: this.requiredString(
        o.cadence_strategy,
        'harmony_plan.cadence_strategy',
      ),
      harmonicTension: this.requiredString(
        o.harmonic_tension,
        'harmony_plan.harmonic_tension',
      ),
    };
  }

  private melodyPlan(value: unknown): MelodyPlan {
    const o = this.object(value, 'melody_plan');
    return {
      contour: this.requiredString(o.contour, 'melody_plan.contour'),
      rangeStrategy: this.requiredString(
        o.range_strategy,
        'melody_plan.range_strategy',
      ),
      motifStrategy: this.requiredString(
        o.motif_strategy,
        'melody_plan.motif_strategy',
      ),
      chorusLift: this.requiredString(
        o.chorus_lift,
        'melody_plan.chorus_lift',
      ),
      climaxStrategy: this.requiredString(
        o.climax_strategy,
        'melody_plan.climax_strategy',
      ),
    };
  }

  private rhythmPlan(value: unknown): RhythmPlan {
    const o = this.object(value, 'rhythm_plan');
    return {
      groove: this.requiredString(o.groove, 'rhythm_plan.groove'),
      pulse: this.requiredString(o.pulse, 'rhythm_plan.pulse'),
      syncopation: this.requiredString(
        o.syncopation,
        'rhythm_plan.syncopation',
      ),
      densityCurve: this.requiredString(
        o.density_curve,
        'rhythm_plan.density_curve',
      ),
    };
  }

  private vocalPhrasingPlan(
    value: unknown,
  ): VocalPhrasingPlan {
    const o = this.object(value, 'vocal_phrasing_plan');
    return {
      verse: this.requiredString(o.verse, 'vocal_phrasing_plan.verse'),
      preChorus: this.requiredString(
        o.pre_chorus,
        'vocal_phrasing_plan.pre_chorus',
      ),
      chorus: this.requiredString(
        o.chorus,
        'vocal_phrasing_plan.chorus',
      ),
      bridge: this.requiredString(
        o.bridge,
        'vocal_phrasing_plan.bridge',
      ),
      finalChorus: this.requiredString(
        o.final_chorus,
        'vocal_phrasing_plan.final_chorus',
      ),
    };
  }

  private instrumentationCues(
    value: unknown,
  ): InstrumentCue[] {
    if (!Array.isArray(value)) {
      throw new Error('instrumentation_cues must be an array');
    }
    return value.map((item, index) => {
      const o = this.object(
        item,
        `instrumentation_cues[${index}]`,
      );
      return {
        instrument: this.requiredString(
          o.instrument,
          `instrumentation_cues[${index}].instrument`,
        ),
        entrySection: this.requiredString(
          o.entry_section,
          `instrumentation_cues[${index}].entry_section`,
        ),
        exitSection: this.requiredString(
          o.exit_section,
          `instrumentation_cues[${index}].exit_section`,
        ),
        role: this.requiredString(
          o.role,
          `instrumentation_cues[${index}].role`,
        ),
      };
    });
  }

  private dynamicsPlan(value: unknown): DynamicsPlan {
    const o = this.object(value, 'dynamics_plan');
    return {
      opening: this.requiredString(o.opening, 'dynamics_plan.opening'),
      development: this.requiredString(
        o.development,
        'dynamics_plan.development',
      ),
      climax: this.requiredString(o.climax, 'dynamics_plan.climax'),
      ending: this.requiredString(o.ending, 'dynamics_plan.ending'),
    };
  }

  private transitionPlan(value: unknown): TransitionPlan[] {
    if (!Array.isArray(value)) {
      throw new Error('transition_plan must be an array');
    }
    return value.map((item, index) => {
      const o = this.object(item, `transition_plan[${index}]`);
      return {
        from: this.requiredString(
          o.from,
          `transition_plan[${index}].from`,
        ),
        to: this.requiredString(
          o.to,
          `transition_plan[${index}].to`,
        ),
        method: this.requiredString(
          o.method,
          `transition_plan[${index}].method`,
        ),
      };
    });
  }

  private hookStrategy(value: unknown): HookStrategy {
    const o = this.object(value, 'hook_strategy');
    return {
      lyricalHook: this.requiredString(
        o.lyrical_hook,
        'hook_strategy.lyrical_hook',
      ),
      melodicHook: this.requiredString(
        o.melodic_hook,
        'hook_strategy.melodic_hook',
      ),
      repetitionStrategy: this.requiredString(
        o.repetition_strategy,
        'hook_strategy.repetition_strategy',
      ),
      placementStrategy: this.requiredString(
        o.placement_strategy,
        'hook_strategy.placement_strategy',
      ),
    };
  }

  private generationConstraints(
    value: unknown,
  ): { mustPreserve: string[]; avoid: string[] } {
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

  private numberRecord(
    value: unknown,
    field: string,
  ): Record<string, number> {
    const o = this.object(value, field);
    const result: Record<string, number> = {};
    for (const [key, raw] of Object.entries(o)) {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) {
        throw new Error(`${field}.${key} must be a non-negative number`);
      }
      result[key] = n;
    }
    return result;
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
      throw new Error(`${field} must be between ${min} and ${max}`);
    }
    return n;
  }
}
