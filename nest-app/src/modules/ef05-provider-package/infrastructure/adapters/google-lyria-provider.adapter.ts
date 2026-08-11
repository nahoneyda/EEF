import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderPackage } from '../../domain/entities/provider-package.entity';
import {
  BuildProviderPackageInput,
  ProviderAdapter,
} from '../../domain/services/provider-adapter.service';

@Injectable()
export class GoogleLyriaProviderAdapter extends ProviderAdapter {
  readonly provider = 'google';

  constructor(private readonly config: ConfigService) {
    super();
  }

  build(input: BuildProviderPackageInput): ProviderPackage {
    const { metadata, lyrics, musicSpec, compositionPlan } = input;

    this.assertConsistency(
      lyrics.hookLine,
      musicSpec.targetDurationSec,
      compositionPlan,
    );

    const outputFormat =
      this.config.get<string>('EF05_OUTPUT_AUDIO_FORMAT') ?? 'mp3';
    const providerModel =
      this.config.get<string>('EF05_PROVIDER_MODEL') ?? 'lyria';
    const packageVersion =
      this.config.get<string>('EF05_PACKAGE_VERSION') ?? 'v1.0';
    const moduleVersion =
      this.config.get<string>('EF05_MODULE_VERSION') ?? 'v1.0';
    const workflowVersion =
      this.config.get<string>('EEF_WORKFLOW_VERSION') ?? 'v1.0';

    const stylePrompt = [
      `${musicSpec.genre}${musicSpec.subgenre ? ` / ${musicSpec.subgenre}` : ''}`,
      `${musicSpec.bpm} BPM`,
      musicSpec.musicalKey,
      musicSpec.timeSignature,
      `mood: ${musicSpec.mood.join(', ')}`,
      `instrumentation: ${JSON.stringify(musicSpec.instrumentation)}`,
      `vocal: ${JSON.stringify(musicSpec.vocalSpec)}`,
      `production: ${JSON.stringify(musicSpec.productionStyle)}`,
      `melody: ${JSON.stringify(compositionPlan.melodyPlan)}`,
      `harmony: ${JSON.stringify(compositionPlan.harmonyPlan)}`,
      `dynamics: ${JSON.stringify(compositionPlan.dynamicsPlan)}`,
    ].join('; ');

    const lyricsPrompt = this.buildLyricsPrompt(lyrics);
    const avoid = Array.from(
      new Set([
        ...this.stringArray(musicSpec.generationConstraints['avoid']),
        ...this.stringArray(compositionPlan.generationConstraints['avoid']),
      ]),
    );
    const mustPreserve = Array.from(
      new Set([
        ...this.stringArray(musicSpec.generationConstraints['must_preserve']),
        ...this.stringArray(
          compositionPlan.generationConstraints['must_preserve'],
        ),
      ]),
    );

    const negativePrompt = avoid.join(', ');

    const providerPrompt = [
      `[TITLE] ${lyrics.titleKo}`,
      `[STYLE] ${stylePrompt}`,
      `[LYRICS] ${lyricsPrompt}`,
      `[ARRANGEMENT] ${JSON.stringify({
        song_structure: compositionPlan.songStructure,
        section_timing: compositionPlan.sectionTiming,
        harmony_plan: compositionPlan.harmonyPlan,
        melody_plan: compositionPlan.melodyPlan,
        dynamics_plan: compositionPlan.dynamicsPlan,
      })}`,
      `[NEGATIVE] ${negativePrompt}`,
    ].join('\n\n');

    return new ProviderPackage({
      packageVersion,
      workflowVersion,
      module: 'EF-05',
      moduleVersion,
      projectId: metadata.projectId,
      projectCode: metadata.projectCode,
      contentUuid: metadata.contentUuid,
      workflowRunId: input.workflowRunId,
      moduleRunId: input.moduleRunId,
      provider: this.provider,
      providerModel,
      titleKo: lyrics.titleKo,
      titleEn: lyrics.titleEn,
      language: lyrics.language,
      stylePrompt,
      lyricsPrompt,
      negativePrompt,
      providerPrompt,
      generationParameters: {
        durationSec: musicSpec.targetDurationSec,
        bpm: musicSpec.bpm,
        musicalKey: musicSpec.musicalKey,
        timeSignature: musicSpec.timeSignature,
        language: lyrics.language,
        outputFormat,
        instrumental: false,
      },
      arrangementPlan: {
        plan_version: compositionPlan.planVersion,
        song_structure: compositionPlan.songStructure,
        section_timing: compositionPlan.sectionTiming,
        harmony_plan: compositionPlan.harmonyPlan,
        melody_plan: compositionPlan.melodyPlan,
        rhythm_plan: compositionPlan.rhythmPlan,
        vocal_phrasing_plan: compositionPlan.vocalPhrasingPlan,
        instrumentation_cues: compositionPlan.instrumentationCues,
        dynamics_plan: compositionPlan.dynamicsPlan,
        transition_plan: compositionPlan.transitionPlan,
        hook_strategy: compositionPlan.hookStrategy,
      },
      qualityRequirements: {
        preserveLyrics: true,
        preserveHook: true,
        preserveDuration: true,
        targetDurationSec: musicSpec.targetDurationSec,
        durationToleranceSec: input.runMode === 'PRODUCTION' ? 5 : 10,
        vocalClarity: 'lyrics-forward, intelligible Korean vocal',
        masteringTarget:
          'balanced streaming-ready output without excessive limiting',
        mustPreserve,
        avoid,
        trace: {
          content_id: metadata.contentId,
          content_uuid: metadata.contentUuid,
          workflow_run_id: input.workflowRunId,
          module_run_id: input.moduleRunId,
          ef02_hook_line: lyrics.hookLine,
          ef03_target_duration_sec: musicSpec.targetDurationSec,
          ef04_plan_version: compositionPlan.planVersion,
        },
      },
      sourceLyrics: {
        title_ko: lyrics.titleKo,
        title_en: lyrics.titleEn,
        concept: lyrics.concept,
        hook_line: lyrics.hookLine,
        lyrics: lyrics.lyrics,
        lyric_keywords: lyrics.lyricKeywords,
        language: lyrics.language,
      },
      packageStatus: 'READY',
      generationModel: 'deterministic-provider-adapter-v1',
      promptVersion: 'EF05-GOOGLE-LYRIA-PACKAGE-V1',
      outputAudioFormat: outputFormat,
    });
  }

  private assertConsistency(
    hookLine: string,
    targetDurationSec: number,
    compositionPlan: BuildProviderPackageInput['compositionPlan'],
  ): void {
    if (compositionPlan.targetDurationSec !== targetDurationSec) {
      throw new Error(
        `EF-03/EF-04 duration mismatch musicSpec=${targetDurationSec} compositionPlan=${compositionPlan.targetDurationSec}`,
      );
    }

    const structureTotal = compositionPlan.songStructure.reduce<number>(
      (sum, item) => {
        const row =
          item && typeof item === 'object' && !Array.isArray(item)
            ? (item as Record<string, unknown>)
            : {};

        const targetSec = Number(row.targetSec ?? row.target_sec ?? 0);

        return sum + targetSec;
      },
      0,
    );

    if (structureTotal !== targetDurationSec) {
      throw new Error(
        `EF-04 structure duration mismatch target=${targetDurationSec} structure=${structureTotal}`,
      );
    }

    const hook = String(
      compositionPlan.hookStrategy['lyricalHook'] ??
        compositionPlan.hookStrategy['lyrical_hook'] ??
        '',
    ).trim();

    if (hook !== hookLine.trim()) {
      throw new Error('EF-02/EF-04 lyrical hook mismatch');
    }
  }

  private buildLyricsPrompt(
    lyrics: BuildProviderPackageInput['lyrics'],
  ): string {
    const order = [
      'verse_1',
      'pre_chorus_1',
      'chorus_1',
      'verse_2',
      'pre_chorus_2',
      'chorus_2',
      'bridge',
      'final_chorus',
      'outro',
    ];

    return [
      `Canonical hook: ${lyrics.hookLine}`,
      ...order
        .filter(
          (key) =>
            typeof lyrics.lyrics[key] === 'string' && lyrics.lyrics[key].trim(),
        )
        .map((key) => `[${key.toUpperCase()}]\n${lyrics.lyrics[key].trim()}`),
    ].join('\n\n');
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value
          .map((x) => (typeof x === 'string' ? x.trim() : ''))
          .filter(Boolean)
      : [];
  }
}
