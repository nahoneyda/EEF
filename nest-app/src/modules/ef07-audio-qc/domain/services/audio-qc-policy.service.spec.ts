import { ConfigService } from '@nestjs/config';
import { AudioQcPolicy } from './audio-qc-policy.service';
import { AudioGenerationSource, AudioTechnicalAnalysis } from '../entities/audio-review.entity';

describe('AudioQcPolicy', () => {
  const policy = new AudioQcPolicy(new ConfigService());
  const source: AudioGenerationSource = {
    id: 'generation', contentUuid: 'content', storageBucket: 'audio', storagePath: 'x.mp3',
    requestPayload: { intended_duration_sec: 210 }, createdAt: new Date().toISOString(),
  };
  const good: AudioTechnicalAnalysis = {
    formatName: 'mp3', codecName: 'mp3', durationSeconds: 30, sampleRate: 44100,
    channels: 2, bitRate: 192000, sampleFormat: 'fltp', bitDepth: null,
    fileSizeBytes: 1000, maxVolumeDb: -1, integratedLufs: -14,
    silenceDurationSeconds: 1, silenceRatio: 1 / 30, clippingRisk: false,
  };

  it('approves a valid TEST preview', () => {
    expect(policy.evaluate(good, source, 'TEST')).toMatchObject({ decision: 'APPROVED', score: 100 });
  });
  it('requests changes for clipping', () => {
    const result = policy.evaluate({ ...good, maxVolumeDb: 0, clippingRisk: true }, source, 'TEST');
    expect(result.decision).toBe('CHANGES_REQUESTED');
    expect(result.issues.some((x) => x.code === 'CLIPPING_RISK')).toBe(true);
  });
  it('rejects unreadable audio', () => {
    expect(policy.evaluate({ ...good, codecName: '', durationSeconds: 0 }, source, 'TEST').decision).toBe('REJECTED');
  });
});
