import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VideoShotInput } from '../../domain/entities/video-generation.entity';
import { VideoProvider } from '../../domain/services/video-services';
import { MockVideoProvider } from '../../infrastructure/google/mock-video.provider';
import { VeoVideoProvider } from '../../infrastructure/google/veo-video.provider';

/** shot 메타를 Veo 모션 프롬프트로 조립 */
export function buildVideoPrompt(shot: VideoShotInput): string {
  const parts: string[] = [];
  parts.push(shot.visualDescription);
  if (shot.cameraMovement && shot.cameraMovement.trim()) {
    parts.push(`Camera motion: ${shot.cameraMovement}.`);
  }
  parts.push('Subtle natural motion, cinematic, smooth, no text overlay.');
  return parts.filter((p) => p && p.trim()).join(' ');
}

/**
 * EF11_PROVIDER_MODE 에 따라 mock/veo provider 를 선택한다.
 * 기본 mock (비용 0). 'veo' 로 설정 시 실제 Veo 호출.
 */
@Injectable()
export class VideoProviderSelector {
  constructor(
    private readonly config: ConfigService,
    private readonly mock: MockVideoProvider,
    private readonly veo: VeoVideoProvider,
  ) {}

  select(): VideoProvider {
    const mode = (this.config.get<string>('EF11_PROVIDER_MODE') ?? 'mock')
      .trim()
      .toLowerCase();
    return mode === 'veo' ? this.veo : this.mock;
  }
}
