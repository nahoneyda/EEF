export type ContextStatus = 'READY';

export interface ProjectContextProps {
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

  contextStatus: ContextStatus;
}

export class ProjectContext {
  readonly language: string;
  readonly genre: string;
  readonly theme: string;
  readonly mood: string[];

  readonly targetAudience: string;
  readonly vocalStyle: string;

  readonly targetDurationSeconds: number;
  readonly tempoBpm: number;

  readonly instrumentStyle: string;
  readonly arrangementStyle: string;
  readonly mixStyle: string;
  readonly masterStyle: string;

  readonly musicalKey: string;
  readonly timeSignature: string;

  readonly videoStyle: string;
  readonly aspectRatio: string;

  readonly contextStatus: ContextStatus;

  constructor(props: ProjectContextProps) {
    this.validate(props);

    this.language = props.language;
    this.genre = props.genre;
    this.theme = props.theme;
    this.mood = [...props.mood];

    this.targetAudience = props.targetAudience;
    this.vocalStyle = props.vocalStyle;

    this.targetDurationSeconds = props.targetDurationSeconds;

    this.tempoBpm = props.tempoBpm;

    this.instrumentStyle = props.instrumentStyle;

    this.arrangementStyle = props.arrangementStyle;

    this.mixStyle = props.mixStyle;

    this.masterStyle = props.masterStyle;

    this.musicalKey = props.musicalKey;

    this.timeSignature = props.timeSignature;

    this.videoStyle = props.videoStyle;

    this.aspectRatio = props.aspectRatio;

    this.contextStatus = props.contextStatus;
  }

  private validate(props: ProjectContextProps): void {
    if (!props.language.trim()) {
      throw new Error('ProjectContext.language is required');
    }

    if (!props.genre.trim()) {
      throw new Error('ProjectContext.genre is required');
    }

    if (!props.theme.trim()) {
      throw new Error('ProjectContext.theme is required');
    }

    if (!Array.isArray(props.mood) || props.mood.length === 0) {
      throw new Error('ProjectContext.mood must contain at least one item');
    }

    if (props.targetDurationSeconds < 30 || props.targetDurationSeconds > 600) {
      throw new Error(
        'ProjectContext.targetDurationSeconds must be between 30 and 600',
      );
    }

    if (props.tempoBpm < 40 || props.tempoBpm > 220) {
      throw new Error('ProjectContext.tempoBpm must be between 40 and 220');
    }
  }

  toPersistence(): Record<string, unknown> {
    return {
      language: this.language,

      genre: this.genre,

      theme: this.theme,

      mood: this.mood,

      target_audience: this.targetAudience,

      vocal_style: this.vocalStyle,

      target_duration_seconds: this.targetDurationSeconds,

      tempo_bpm: this.tempoBpm,

      instrument_style: this.instrumentStyle,

      arrangement_style: this.arrangementStyle,

      mix_style: this.mixStyle,

      master_style: this.masterStyle,

      musical_key: this.musicalKey,

      time_signature: this.timeSignature,

      video_style: this.videoStyle,

      aspect_ratio: this.aspectRatio,

      context_status: this.contextStatus,
    };
  }
}
