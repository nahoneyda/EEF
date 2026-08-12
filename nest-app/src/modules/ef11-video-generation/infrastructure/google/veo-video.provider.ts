import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VideoProviderResult } from '../../domain/entities/video-generation.entity';
import {
  GenerateVideoProviderInput,
  VideoProvider,
} from '../../domain/services/video-services';

/**
 * Google Veo image-to-video / text-to-video provider (REST, 비동기 폴링).
 *
 * 흐름:
 *   1) POST {model}:predictLongRunning  -> operation name 반환
 *   2) GET  {operation name} 폴링       -> done=true 까지 대기
 *   3) 결과 video uri 다운로드           -> mp4 바이트
 *
 * EF11_PROVIDER_MODE=veo 일 때만 사용된다. (비용 발생)
 */
@Injectable()
export class VeoVideoProvider extends VideoProvider {
  readonly provider = 'GOOGLE_VEO';
  private readonly logger = new Logger(VeoVideoProvider.name);
  private readonly base = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(private readonly config: ConfigService) {
    super();
  }

  async generate(
    input: GenerateVideoProviderInput,
  ): Promise<VideoProviderResult> {
    const apiKey =
      this.config.get<string>('GEMINI_API_KEY') ??
      this.config.get<string>('GOOGLE_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is required');
    }

    const started = Date.now();
    const pollIntervalMs =
      Number(this.config.get<string>('EF11_POLL_INTERVAL_SECONDS') ?? '10') *
      1000;
    const maxWaitMs =
      Number(this.config.get<string>('EF11_MAX_WAIT_SECONDS') ?? '600') * 1000;

    // 1) 생성 시작
    const instance: Record<string, unknown> = { prompt: input.prompt };
    if (input.imageBytes) {
      instance.image = {
        bytesBase64Encoded: input.imageBytes.toString('base64'),
        mimeType: input.imageMimeType ?? 'image/png',
      };
    }

    const startUrl = `${this.base}/models/${encodeURIComponent(input.model)}:predictLongRunning`;
    const startRes = await fetch(startUrl, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [instance],
        parameters: {
          aspectRatio: input.aspectRatio,
          // image-to-video 는 8초만 지원되므로, 이미지가 있으면 8로 강제.
          durationSeconds: input.imageBytes ? 8 : input.durationSec,
        },
      }),
    });

    const startText = await startRes.text();
    if (!startRes.ok) {
      throw new Error(
        `Veo predictLongRunning failed status=${startRes.status} ${startText.substring(0, 800)}`,
      );
    }

    const operationName = (JSON.parse(startText) as { name?: string }).name;
    if (!operationName) {
      throw new Error('Veo did not return an operation name');
    }

    // 2) 폴링
    const deadline = Date.now() + maxWaitMs;
    let opJson: VeoOperation | null = null;
    for (;;) {
      if (Date.now() > deadline) {
        throw new Error(`Veo generation timed out after ${maxWaitMs}ms`);
      }
      await this.sleep(pollIntervalMs);

      const pollRes = await fetch(`${this.base}/${operationName}`, {
        headers: { 'x-goog-api-key': apiKey },
      });
      const pollText = await pollRes.text();
      if (!pollRes.ok) {
        throw new Error(
          `Veo operation poll failed status=${pollRes.status} ${pollText.substring(0, 500)}`,
        );
      }
      opJson = JSON.parse(pollText) as VeoOperation;
      if (opJson.done) break;
    }

    if (opJson.error) {
      throw new Error(
        `Veo operation error: ${opJson.error.message ?? JSON.stringify(opJson.error)}`,
      );
    }

    const sample =
      opJson.response?.generateVideoResponse?.generatedSamples?.[0];
    const raiReason =
      opJson.response?.generateVideoResponse?.raiMediaFilteredReasons?.[0];

    if (!sample?.video?.uri) {
      if (raiReason) {
        const err = new Error(`Veo filtered: ${raiReason}`) as Error & {
          raiFilteredReason?: string;
        };
        err.raiFilteredReason = raiReason;
        throw err;
      }
      throw new Error('Veo operation done but no video uri returned');
    }

    // 3) 다운로드 (uri 에 x-goog-api-key 필요)
    const dlRes = await fetch(sample.video.uri, {
      headers: { 'x-goog-api-key': apiKey },
    });
    if (!dlRes.ok) {
      const t = await dlRes.text();
      throw new Error(
        `Veo video download failed status=${dlRes.status} ${t.substring(0, 300)}`,
      );
    }
    const arrayBuf = await dlRes.arrayBuffer();
    const video = Buffer.from(arrayBuf);
    if (!video.length) {
      throw new Error('Veo downloaded empty video');
    }

    return {
      provider: this.provider,
      model: input.model,
      video,
      mimeType: 'video/mp4',
      extension: 'mp4',
      durationSec: input.imageBytes ? 8 : input.durationSec,
      hasAudio: true,
      generationTimeSeconds: Number(((Date.now() - started) / 1000).toFixed(1)),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

interface VeoOperation {
  done?: boolean;
  error?: { message?: string };
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{ video?: { uri?: string } }>;
      raiMediaFilteredReasons?: string[];
    };
  };
}
