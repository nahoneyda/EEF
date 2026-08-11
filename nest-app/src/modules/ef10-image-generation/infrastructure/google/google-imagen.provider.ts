import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GenerateImageProviderInput,
  ImageProvider,
} from '../../domain/services/image-services';
import { ImageProviderResult } from '../../domain/entities/image-generation.entity';

@Injectable()
export class GoogleImagenProvider extends ImageProvider {
  readonly provider = 'GOOGLE_GEMINI_IMAGE';
  private readonly logger = new Logger(GoogleImagenProvider.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  async generate(
    input: GenerateImageProviderInput,
  ): Promise<ImageProviderResult> {
    const apiKey =
      this.config.get<string>('GEMINI_API_KEY') ??
      this.config.get<string>('GOOGLE_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is required');
    }

    const timeoutMs =
      Number(
        this.config.get<string>('EF10_GENERATION_TIMEOUT_SECONDS') ?? '120',
      ) * 1000;
    const started = Date.now();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url =
        'https://generativelanguage.googleapis.com/' +
        `v1beta/models/${encodeURIComponent(input.model)}:generateContent`;

      const body = {
        contents: [
          {
            role: 'user',
            parts: [{ text: input.prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: input.aspectRatio,
          },
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(
          `Gemini image generateContent failed status=${response.status} ${responseText.substring(0, 800)}`,
        );
      }

      const parsed = JSON.parse(responseText) as GenerateContentResponse;

      const candidate = parsed.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];
      const imagePart = parts.find(
        (p) => p.inlineData?.data && p.inlineData.data.length > 0,
      );

      if (!imagePart?.inlineData?.data) {
        const finishReason = candidate?.finishReason ?? 'UNKNOWN';
        const blockReason = parsed.promptFeedback?.blockReason;
        if (blockReason || finishReason === 'SAFETY') {
          const err = new Error(
            `Gemini image filtered: ${blockReason ?? finishReason}`,
          ) as Error & { raiFilteredReason?: string };
          err.raiFilteredReason = blockReason ?? finishReason;
          throw err;
        }
        throw new Error(
          `Gemini image response contained no image (finishReason=${finishReason})`,
        );
      }

      const mimeType = imagePart.inlineData.mimeType ?? 'image/png';
      const image = Buffer.from(imagePart.inlineData.data, 'base64');
      if (!image.length) {
        throw new Error('Gemini image returned empty bytes');
      }

      const extension = mimeType.includes('jpeg') ? 'jpg' : 'png';
      const textPart = parts.find((p) => typeof p.text === 'string' && p.text);

      return {
        provider: this.provider,
        model: input.model,
        image,
        mimeType,
        extension,
        enhancedPrompt: textPart?.text,
        generationTimeSeconds: Number(
          ((Date.now() - started) / 1000).toFixed(3),
        ),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

interface GenerateContentResponse {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
      }>;
    };
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
}
