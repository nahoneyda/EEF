export interface InstrumentationSpec {
  primary: string[];
  secondary: string[];
  avoid: string[];
}

export interface VocalSpec {
  type: string;
  genderCharacter: string;
  ageCharacter: string;
  tone: string;
  range: string;
  delivery: string;
  vibrato: string;
  harmony: string;
}

export interface ArrangementSpec {
  intro: string;
  verse: string;
  preChorus: string;
  chorus: string;
  bridge: string;
  finalChorus: string;
  ending: string;
}

export interface ProductionStyleSpec {
  overall: string;
  acousticRatio: number;
  electronicRatio: number;
  dynamicRange: string;
  mixCharacter: string;
  reverb: string;
  masteringCharacter: string;
}

export interface GenerationConstraintsSpec {
  mustPreserve: string[];
  avoid: string[];
}

export interface MusicSpecProps {
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
  instrumentation: InstrumentationSpec;
  vocalSpec: VocalSpec;
  arrangement: ArrangementSpec;
  productionStyle: ProductionStyleSpec;
  generationConstraints: GenerationConstraintsSpec;
  status: 'READY';
  specVersion: string;
  sourceModule: 'EF-03';
  modelProvider?: string;
  modelName?: string;
  promptVersion?: string;
}

export class MusicSpec {
  readonly genre: string;
  readonly subgenre?: string;
  readonly bpm: number;
  readonly musicalKey: string;
  readonly timeSignature: string;
  readonly targetDurationSec: number;
  readonly energy?: number;
  readonly valence?: number;
  readonly danceability?: number;
  readonly mood: string[];
  readonly instrumentation: InstrumentationSpec;
  readonly vocalSpec: VocalSpec;
  readonly arrangement: ArrangementSpec;
  readonly productionStyle: ProductionStyleSpec;
  readonly generationConstraints: GenerationConstraintsSpec;
  readonly status: 'READY';
  readonly specVersion: string;
  readonly sourceModule: 'EF-03';
  readonly modelProvider?: string;
  readonly modelName?: string;
  readonly promptVersion?: string;

  constructor(props: MusicSpecProps) {
    this.genre = props.genre.trim();
    this.subgenre = props.subgenre?.trim();
    this.bpm = props.bpm;
    this.musicalKey = props.musicalKey.trim();
    this.timeSignature = props.timeSignature.trim();
    this.targetDurationSec = props.targetDurationSec;
    this.energy = props.energy;
    this.valence = props.valence;
    this.danceability = props.danceability;
    this.mood = [...props.mood];
    this.instrumentation = { ...props.instrumentation };
    this.vocalSpec = { ...props.vocalSpec };
    this.arrangement = { ...props.arrangement };
    this.productionStyle = { ...props.productionStyle };
    this.generationConstraints = { ...props.generationConstraints };
    this.status = props.status;
    this.specVersion = props.specVersion;
    this.sourceModule = props.sourceModule;
    this.modelProvider = props.modelProvider;
    this.modelName = props.modelName;
    this.promptVersion = props.promptVersion;
  }

  toPersistence(): Record<string, unknown> {
    return {
      spec_version: this.specVersion,
      genre: this.genre,
      subgenre: this.subgenre ?? null,
      bpm: this.bpm,
      musical_key: this.musicalKey,
      time_signature: this.timeSignature,
      target_duration_sec: this.targetDurationSec,
      energy: this.energy ?? null,
      valence: this.valence ?? null,
      danceability: this.danceability ?? null,
      mood: this.mood,
      instrumentation: this.instrumentation,
      vocal_spec: {
        type: this.vocalSpec.type,
        gender_character: this.vocalSpec.genderCharacter,
        age_character: this.vocalSpec.ageCharacter,
        tone: this.vocalSpec.tone,
        range: this.vocalSpec.range,
        delivery: this.vocalSpec.delivery,
        vibrato: this.vocalSpec.vibrato,
        harmony: this.vocalSpec.harmony,
      },
      arrangement: {
        intro: this.arrangement.intro,
        verse: this.arrangement.verse,
        pre_chorus: this.arrangement.preChorus,
        chorus: this.arrangement.chorus,
        bridge: this.arrangement.bridge,
        final_chorus: this.arrangement.finalChorus,
        ending: this.arrangement.ending,
      },
      production_style: {
        overall: this.productionStyle.overall,
        acoustic_ratio: this.productionStyle.acousticRatio,
        electronic_ratio: this.productionStyle.electronicRatio,
        dynamic_range: this.productionStyle.dynamicRange,
        mix_character: this.productionStyle.mixCharacter,
        reverb: this.productionStyle.reverb,
        mastering_character: this.productionStyle.masteringCharacter,
      },
      generation_constraints: {
        must_preserve: this.generationConstraints.mustPreserve,
        avoid: this.generationConstraints.avoid,
      },
      status: this.status,
      source_module: this.sourceModule,
      model_provider: this.modelProvider ?? null,
      model_name: this.modelName ?? null,
      prompt_version: this.promptVersion ?? null,
    };
  }
}
