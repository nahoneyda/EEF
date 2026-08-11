import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { AudioAnalyzer } from '../domain/services/audio-analyzer.service';
import { AudioTechnicalAnalysis } from '../domain/entities/audio-review.entity';

const execFileAsync = promisify(execFile);

@Injectable()
export class FfmpegAudioAnalyzer extends AudioAnalyzer {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async analyze(filePath: string): Promise<AudioTechnicalAnalysis> {
    const ffprobe = this.config.get<string>('FFPROBE_PATH') ?? 'ffprobe';
    const ffmpeg = this.config.get<string>('FFMPEG_PATH') ?? 'ffmpeg';
    const probe = await execFileAsync(ffprobe, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', filePath], { maxBuffer: 10 * 1024 * 1024 });
    const parsed = JSON.parse(probe.stdout) as ProbeOutput;
    const stream = parsed.streams?.find((x) => x.codec_type === 'audio');
    if (!stream) throw new Error('FFprobe audio stream not found');
    const duration = this.num(parsed.format?.duration ?? stream.duration, 0);

    const volume = await this.ffmpegOutput(ffmpeg, ['-hide_banner', '-i', filePath, '-af', 'volumedetect', '-f', 'null', '-']);
    const silence = await this.ffmpegOutput(ffmpeg, ['-hide_banner', '-i', filePath, '-af', 'silencedetect=noise=-50dB:d=0.5', '-f', 'null', '-']);
    const loudness = await this.ffmpegOutput(ffmpeg, ['-hide_banner', '-i', filePath, '-af', 'ebur128=framelog=verbose', '-f', 'null', '-']);
    const maxVolumeDb = this.matchLast(volume, /max_volume:\s*(-?(?:inf|\d+(?:\.\d+)?))\s*dB/gi);
    const silenceDuration = this.sumMatches(silence, /silence_duration:\s*(\d+(?:\.\d+)?)/gi);
    const integratedLufs = this.matchLast(loudness, /\bI:\s*(-?\d+(?:\.\d+)?)\s*LUFS/gi);

    return {
      formatName: String(parsed.format?.format_name ?? ''),
      codecName: String(stream.codec_name ?? ''),
      durationSeconds: duration,
      sampleRate: this.num(stream.sample_rate, 0),
      channels: this.num(stream.channels, 0),
      bitRate: this.nullableNum(stream.bit_rate ?? parsed.format?.bit_rate),
      sampleFormat: stream.sample_fmt ? String(stream.sample_fmt) : null,
      bitDepth: this.nullableNum(stream.bits_per_raw_sample ?? stream.bits_per_sample),
      fileSizeBytes: this.num(parsed.format?.size, 0),
      maxVolumeDb,
      integratedLufs,
      silenceDurationSeconds: silenceDuration,
      silenceRatio: duration > 0 ? Math.min(1, silenceDuration / duration) : 1,
      clippingRisk: maxVolumeDb !== null && maxVolumeDb >= -0.1,
    };
  }

  private async ffmpegOutput(command: string, args: string[]): Promise<string> {
    try {
      const result = await execFileAsync(command, args, { maxBuffer: 20 * 1024 * 1024 });
      return `${result.stdout}\n${result.stderr}`;
    } catch (error) {
      const e = error as { stdout?: string; stderr?: string; message?: string };
      if (e.stderr && !/error|invalid|failed/i.test(e.stderr)) return `${e.stdout ?? ''}\n${e.stderr}`;
      throw new Error(`FFmpeg analysis failed: ${e.message ?? 'unknown error'}`);
    }
  }
  private num(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  private nullableNum(value: unknown): number | null {
    const parsed = Number(value);
    return value !== null && value !== undefined && value !== '' && Number.isFinite(parsed) ? parsed : null;
  }
  private matchLast(text: string, regex: RegExp): number | null {
    let match: RegExpExecArray | null;
    let value: number | null = null;
    while ((match = regex.exec(text)) !== null) {
      const parsed = Number(match[1]);
      if (Number.isFinite(parsed)) value = parsed;
    }
    return value;
  }
  private sumMatches(text: string, regex: RegExp): number {
    let match: RegExpExecArray | null;
    let total = 0;
    while ((match = regex.exec(text)) !== null) total += this.num(match[1], 0);
    return total;
  }
}

interface ProbeOutput {
  streams?: Array<Record<string, unknown>>;
  format?: Record<string, unknown>;
}
