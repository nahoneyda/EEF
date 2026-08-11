export interface CompositionSection {
  section: string;
  order: number;
  targetSec: number;
  purpose: string;
}

export interface HarmonyPlan {
  tonalCenter: string;
  progressionDirection: string[];
  cadenceStrategy: string;
  harmonicTension: string;
}

export interface MelodyPlan {
  contour: string;
  rangeStrategy: string;
  motifStrategy: string;
  chorusLift: string;
  climaxStrategy: string;
}

export interface RhythmPlan {
  groove: string;
  pulse: string;
  syncopation: string;
  densityCurve: string;
}

export interface VocalPhrasingPlan {
  verse: string;
  preChorus: string;
  chorus: string;
  bridge: string;
  finalChorus: string;
}

export interface InstrumentCue {
  instrument: string;
  entrySection: string;
  exitSection: string;
  role: string;
}

export interface DynamicsPlan {
  opening: string;
  development: string;
  climax: string;
  ending: string;
}

export interface TransitionPlan {
  from: string;
  to: string;
  method: string;
}

export interface HookStrategy {
  lyricalHook: string;
  melodicHook: string;
  repetitionStrategy: string;
  placementStrategy: string;
}

export interface CompositionPlanProps {
  planVersion: string;
  titleKo: string;
  titleEn: string;
  language: string;
  targetDurationSec: number;
  bpm: number;
  musicalKey: string;
  timeSignature: string;

  songStructure: CompositionSection[];
  sectionTiming: Record<string, number>;
  harmonyPlan: HarmonyPlan;
  melodyPlan: MelodyPlan;
  rhythmPlan: RhythmPlan;
  vocalPhrasingPlan: VocalPhrasingPlan;
  instrumentationCues: InstrumentCue[];
  dynamicsPlan: DynamicsPlan;
  transitionPlan: TransitionPlan[];
  hookStrategy: HookStrategy;
  generationConstraints: {
    mustPreserve: string[];
    avoid: string[];
  };

  planStatus: 'READY';
  generationModel?: string;
  promptVersion?: string;
  sourceModule: 'EF-04';
}

export class CompositionPlan {
  readonly planVersion: string;
  readonly titleKo: string;
  readonly titleEn: string;
  readonly language: string;
  readonly targetDurationSec: number;
  readonly bpm: number;
  readonly musicalKey: string;
  readonly timeSignature: string;

  readonly songStructure: CompositionSection[];
  readonly sectionTiming: Record<string, number>;
  readonly harmonyPlan: HarmonyPlan;
  readonly melodyPlan: MelodyPlan;
  readonly rhythmPlan: RhythmPlan;
  readonly vocalPhrasingPlan: VocalPhrasingPlan;
  readonly instrumentationCues: InstrumentCue[];
  readonly dynamicsPlan: DynamicsPlan;
  readonly transitionPlan: TransitionPlan[];
  readonly hookStrategy: HookStrategy;
  readonly generationConstraints: {
    mustPreserve: string[];
    avoid: string[];
  };

  readonly planStatus: 'READY';
  readonly generationModel?: string;
  readonly promptVersion?: string;
  readonly sourceModule: 'EF-04';

  constructor(props: CompositionPlanProps) {
    this.planVersion = props.planVersion;
    this.titleKo = props.titleKo.trim();
    this.titleEn = props.titleEn.trim();
    this.language = props.language.trim();
    this.targetDurationSec = props.targetDurationSec;
    this.bpm = props.bpm;
    this.musicalKey = props.musicalKey.trim();
    this.timeSignature = props.timeSignature.trim();

    this.songStructure = [...props.songStructure];
    this.sectionTiming = { ...props.sectionTiming };
    this.harmonyPlan = { ...props.harmonyPlan };
    this.melodyPlan = { ...props.melodyPlan };
    this.rhythmPlan = { ...props.rhythmPlan };
    this.vocalPhrasingPlan = { ...props.vocalPhrasingPlan };
    this.instrumentationCues = [...props.instrumentationCues];
    this.dynamicsPlan = { ...props.dynamicsPlan };
    this.transitionPlan = [...props.transitionPlan];
    this.hookStrategy = { ...props.hookStrategy };
    this.generationConstraints = {
      mustPreserve: [...props.generationConstraints.mustPreserve],
      avoid: [...props.generationConstraints.avoid],
    };

    this.planStatus = props.planStatus;
    this.generationModel = props.generationModel;
    this.promptVersion = props.promptVersion;
    this.sourceModule = props.sourceModule;
  }

  toPersistence(): Record<string, unknown> {
    return {
      plan_version: this.planVersion,
      title_ko: this.titleKo,
      title_en: this.titleEn,
      language: this.language,
      target_duration_sec: this.targetDurationSec,
      bpm: this.bpm,
      musical_key: this.musicalKey,
      time_signature: this.timeSignature,
      song_structure: this.songStructure,
      section_timing: this.sectionTiming,
      harmony_plan: this.harmonyPlan,
      melody_plan: this.melodyPlan,
      rhythm_plan: this.rhythmPlan,
      vocal_phrasing_plan: this.vocalPhrasingPlan,
      instrumentation_cues: this.instrumentationCues,
      dynamics_plan: this.dynamicsPlan,
      transition_plan: this.transitionPlan,
      hook_strategy: this.hookStrategy,
      generation_constraints: {
        must_preserve: this.generationConstraints.mustPreserve,
        avoid: this.generationConstraints.avoid,
      },
      plan_status: this.planStatus,
      generation_model: this.generationModel ?? null,
      prompt_version: this.promptVersion ?? null,
      source_module: this.sourceModule,
    };
  }
}
