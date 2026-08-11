import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AudioGenerationSource,
  AudioQcResult,
  AudioTechnicalAnalysis,
  QcIssue,
} from '../entities/audio-review.entity';

@Injectable()
export class AudioQcPolicy {
  constructor(private readonly config: ConfigService) {}

  evaluate(
    analysis: AudioTechnicalAnalysis,
    source: AudioGenerationSource,
    runMode: string,
  ): AudioQcResult {
    const issues: QcIssue[] = [];
    const production = runMode.toUpperCase() === 'PRODUCTION';
    const expected = this.number(source.requestPayload.intended_duration_sec);
    const testMin = this.env('EF07_TEST_MIN_DURATION_SEC', 25);
    const testMax = this.env('EF07_TEST_MAX_DURATION_SEC', 40);
    const tolerance = this.env('EF07_PRODUCTION_DURATION_TOLERANCE_SEC', 12);
    const minSampleRate = this.env('EF07_MIN_SAMPLE_RATE', 44100);
    const maxSilenceRatio = this.env('EF07_MAX_SILENCE_RATIO', 0.12);
    const maxPeak = this.env('EF07_MAX_PEAK_DB', -0.1);
    const minLufs = this.env('EF07_MIN_LUFS', -18);
    const maxLufs = this.env('EF07_MAX_LUFS', -8);

    if (!analysis.codecName || !analysis.formatName)
      issues.push(this.issue('FORMAT_UNREADABLE', 'FATAL', 'Codec/format을 확인할 수 없습니다.', 100));
    if (analysis.durationSeconds <= 0)
      issues.push(this.issue('INVALID_DURATION', 'FATAL', '오디오 길이가 0초 이하입니다.', 100));
    if (!production && (analysis.durationSeconds < testMin || analysis.durationSeconds > testMax))
      issues.push(this.issue('TEST_DURATION_OUT_OF_RANGE', 'ERROR', `TEST 길이 ${analysis.durationSeconds.toFixed(2)}초가 ${testMin}~${testMax}초 범위를 벗어났습니다.`, 25));
    if (production && expected !== null && Math.abs(analysis.durationSeconds - expected) > tolerance)
      issues.push(this.issue('PRODUCTION_DURATION_MISMATCH', 'ERROR', `실측 길이와 목표 길이의 차이가 ${tolerance}초를 초과합니다.`, 25));
    if (analysis.sampleRate < minSampleRate)
      issues.push(this.issue('LOW_SAMPLE_RATE', 'ERROR', `sample rate가 ${minSampleRate}Hz 미만입니다.`, 15));
    if (analysis.channels < 1 || analysis.channels > 2)
      issues.push(this.issue('INVALID_CHANNELS', 'ERROR', '채널 수는 mono 또는 stereo여야 합니다.', 15));
    if (analysis.silenceRatio > maxSilenceRatio)
      issues.push(this.issue('EXCESSIVE_SILENCE', 'ERROR', `무음 비율이 ${(maxSilenceRatio * 100).toFixed(0)}%를 초과합니다.`, 20));
    if (analysis.clippingRisk || (analysis.maxVolumeDb !== null && analysis.maxVolumeDb >= maxPeak))
      issues.push(this.issue('CLIPPING_RISK', 'ERROR', 'peak가 0dBFS에 지나치게 가까워 clipping 위험이 있습니다.', 20));
    if (analysis.integratedLufs !== null && (analysis.integratedLufs < minLufs || analysis.integratedLufs > maxLufs))
      issues.push(this.issue('LOUDNESS_OUT_OF_RANGE', 'WARNING', `integrated loudness가 ${minLufs}~${maxLufs} LUFS 범위를 벗어났습니다.`, 8));
    if (source.durationSeconds && Math.abs(source.durationSeconds - analysis.durationSeconds) > 2)
      issues.push(this.issue('METADATA_DURATION_MISMATCH', 'WARNING', 'EF-06 저장 길이와 FFprobe 실측값이 2초 넘게 다릅니다.', 5));

    const score = Math.max(0, Math.min(100, 100 - issues.reduce((sum, x) => sum + x.deduction, 0)));
    const decision = issues.some((x) => x.severity === 'FATAL')
      ? 'REJECTED'
      : issues.some((x) => x.severity === 'ERROR')
        ? 'CHANGES_REQUESTED'
        : 'APPROVED';
    return {
      decision,
      score,
      issues,
      checks: {
        mode: production ? 'PRODUCTION' : 'TEST',
        duration: { passed: !issues.some((x) => x.code.includes('DURATION')), measured: analysis.durationSeconds, expected },
        format: { passed: Boolean(analysis.codecName && analysis.formatName), codec: analysis.codecName, container: analysis.formatName },
        sampleRate: { passed: analysis.sampleRate >= minSampleRate, measured: analysis.sampleRate, minimum: minSampleRate },
        channels: { passed: analysis.channels >= 1 && analysis.channels <= 2, measured: analysis.channels },
        silence: { passed: analysis.silenceRatio <= maxSilenceRatio, ratio: analysis.silenceRatio, seconds: analysis.silenceDurationSeconds },
        peak: { passed: !analysis.clippingRisk, maxVolumeDb: analysis.maxVolumeDb },
        loudness: { integratedLufs: analysis.integratedLufs },
      },
    };
  }

  private issue(code: string, severity: QcIssue['severity'], message: string, deduction: number): QcIssue {
    return { code, severity, message, deduction };
  }
  private env(name: string, fallback: number): number {
    const value = Number(this.config.get<string>(name) ?? fallback);
    return Number.isFinite(value) ? value : fallback;
  }
  private number(value: unknown): number | null {
    const parsed = Number(value);
    return value !== null && value !== undefined && Number.isFinite(parsed) ? parsed : null;
  }
}
