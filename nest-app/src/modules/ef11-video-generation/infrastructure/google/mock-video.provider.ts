import { Injectable, Logger } from '@nestjs/common';
import {
  GenerateVideoProviderInput,
  VideoProvider,
} from '../../domain/services/video-services';
import { VideoProviderResult } from '../../domain/entities/video-generation.entity';

/**
 * 비용 0 의 목(mock) 영상 provider.
 * 실제 Veo 호출 없이, 저장/DB/검증 파이프라인을 그대로 통과시키기 위한 최소 mp4 바이트를 생성한다.
 * EF11_PROVIDER_MODE 가 'veo' 가 아니면 이 provider 가 사용된다.
 */
@Injectable()
export class MockVideoProvider extends VideoProvider {
  readonly provider = 'MOCK_VIDEO';
  private readonly logger = new Logger(MockVideoProvider.name);

  async generate(
    input: GenerateVideoProviderInput,
  ): Promise<VideoProviderResult> {
    this.logger.log(
      `MOCK video generate (model=${input.model}, dur=${input.durationSec}s, i2v=${!!input.imageBytes})`,
    );

    // 최소한의 유효한 mp4 ftyp 박스 헤더 + 약간의 패딩.
    // 실제 재생 가능한 영상은 아니지만, 저장/체크섬/메타데이터 경로를 검증하기에 충분하다.
    const ftyp = Buffer.from([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
      0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
    ]);
    const marker = Buffer.from(
      `MOCK_EF11 shot mp4 placeholder ${input.durationSec}s ${Date.now()}`,
      'utf8',
    );
    const video = Buffer.concat([ftyp, marker]);

    return {
      provider: this.provider,
      model: input.model,
      video,
      mimeType: 'video/mp4',
      extension: 'mp4',
      durationSec: input.durationSec,
      hasAudio: false,
      generationTimeSeconds: 0,
    };
  }
}
