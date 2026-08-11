export interface ProviderGenerationParameters {
  durationSec: number;
  bpm: number;
  musicalKey: string;
  timeSignature: string;
  language: string;
  outputFormat: string;
  instrumental: boolean;
}

export interface ProviderQualityRequirements {
  preserveLyrics: boolean;
  preserveHook: boolean;
  preserveDuration: boolean;
  targetDurationSec: number;
  durationToleranceSec: number;
  vocalClarity: string;
  masteringTarget: string;
  mustPreserve: string[];
  avoid: string[];
  trace: Record<string, unknown>;
}

export interface ProviderPackageProps {
  packageVersion: string;
  workflowVersion: string;
  module: 'EF-05';
  moduleVersion: string;
  projectId: string;
  projectCode: string;
  contentUuid: string;
  workflowRunId: string;
  moduleRunId: string;
  provider: string;
  providerModel?: string;
  titleKo: string;
  titleEn: string;
  language: string;
  stylePrompt: string;
  lyricsPrompt: string;
  negativePrompt: string;
  providerPrompt: string;
  generationParameters: ProviderGenerationParameters;
  arrangementPlan: Record<string, unknown>;
  qualityRequirements: ProviderQualityRequirements;
  sourceLyrics: Record<string, unknown>;
  packageStatus: 'READY';
  generationModel: string;
  promptVersion: string;
  outputAudioFormat: string;
}

export class ProviderPackage {
  constructor(readonly props: ProviderPackageProps) {}

  get packageVersion() { return this.props.packageVersion; }
  get provider() { return this.props.provider; }
  get providerModel() { return this.props.providerModel; }
  get titleKo() { return this.props.titleKo; }
  get packageStatus() { return this.props.packageStatus; }
  get outputAudioFormat() { return this.props.outputAudioFormat; }

  toPersistence(): Record<string, unknown> {
    return {
      package_version: this.props.packageVersion,
      workflow_version: this.props.workflowVersion,
      module: this.props.module,
      module_version: this.props.moduleVersion,
      project_id: this.props.projectId,
      project_code: this.props.projectCode,
      content_uuid: this.props.contentUuid,
      workflow_run_id: this.props.workflowRunId,
      module_run_id: this.props.moduleRunId,
      provider: this.props.provider,
      provider_model: this.props.providerModel ?? null,
      title_ko: this.props.titleKo,
      title_en: this.props.titleEn,
      language: this.props.language,
      style_prompt: this.props.stylePrompt,
      lyrics_prompt: this.props.lyricsPrompt,
      negative_prompt: this.props.negativePrompt,
      provider_prompt: this.props.providerPrompt,
      generation_parameters: this.props.generationParameters,
      arrangement_plan: this.props.arrangementPlan,
      quality_requirements: this.props.qualityRequirements,
      source_lyrics: this.props.sourceLyrics,
      package_status: this.props.packageStatus,
      generation_model: this.props.generationModel,
      prompt_version: this.props.promptVersion,
      output_audio_format: this.props.outputAudioFormat,
    };
  }
}
