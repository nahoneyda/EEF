import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type GeefRunMode = 'TEST' | 'PRODUCTION';

export interface GoogleModelRegistry {
  lyrics: string;
  music: string;
  image: string;
  video: string;
}

@Injectable()
export class ModelRegistryService {
  constructor(
    private readonly config: ConfigService,
  ) {}

  getGoogleModels(
    runMode: string = 'TEST',
  ): GoogleModelRegistry {
    const mode = String(runMode).trim().toUpperCase();
    const production = mode === 'PRODUCTION';

    return {
      lyrics:
        this.config.get<string>(
          production
            ? 'GEMINI_LYRICS_MODEL_PRODUCTION'
            : 'GEMINI_LYRICS_MODEL_TEST',
        ) ??
        (production
          ? 'gemini-3.5-flash'
          : 'gemini-3.5-flash-lite'),

      music:
        this.config.get<string>(
          production
            ? 'LYRIA_MODEL_PRODUCTION'
            : 'LYRIA_MODEL_TEST',
        ) ??
        (production
          ? 'lyria-3-pro-preview'
          : 'lyria-3-clip-preview'),

      image:
        this.config.get<string>(
          production
            ? 'IMAGE_MODEL_PRODUCTION'
            : 'IMAGE_MODEL_TEST',
        ) ??
        (production
          ? 'gemini-3-pro-image'
          : 'gemini-3.1-flash-lite-image'),

      video:
        this.config.get<string>(
          production
            ? 'VIDEO_MODEL_PRODUCTION'
            : 'VIDEO_MODEL_TEST',
        ) ??
        (production
          ? 'veo-3.1-generate-preview'
          : 'veo-3.1-lite-generate-preview'),
    };
  }
}
