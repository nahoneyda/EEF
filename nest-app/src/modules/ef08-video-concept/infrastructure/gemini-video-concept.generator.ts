import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAiService } from '../../../common/ai/google-ai.service';
import { ModelRegistryService } from '../../../common/ai/model-registry.service';
import { VideoConcept } from '../domain/entities/video-concept.entity';
import { VideoConceptSources } from '../domain/repositories/video-concept.repository';
import {
  VideoConceptGenerationResult,
  VideoConceptGenerator,
} from '../domain/services/video-concept-generator.service';

@Injectable()
export class GeminiVideoConceptGenerator extends VideoConceptGenerator {
  constructor(
    private readonly googleAi: GoogleAiService,
    private readonly models: ModelRegistryService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async generate(
    sources: VideoConceptSources,
    runMode: string,
  ): Promise<VideoConceptGenerationResult> {
    const production = runMode === 'PRODUCTION';
    const model =
      this.config.get<string>(
        production
          ? 'GEMINI_VIDEO_CONCEPT_MODEL_PRODUCTION'
          : 'GEMINI_VIDEO_CONCEPT_MODEL_TEST',
      ) ?? this.models.getGoogleModels(runMode).lyrics;
    const promptText = this.buildPrompt(sources, runMode);
    const maxOutputTokens = Number(
      this.config.get<string>('GEMINI_VIDEO_CONCEPT_MAX_OUTPUT_TOKENS') ??
        '8192',
    );

    const result = await this.googleAi.generateStructuredJson({
      model,
      systemInstruction: [
        '당신은 한국 대중음악과 시네마틱 뮤직비디오를 설계하는 크리에이티브 디렉터입니다.',
        'EF-01부터 EF-07까지의 승인된 SSOT를 바탕으로 EF-09 스토리보드가 바로 사용할 수 있는 영상 콘셉트를 만드세요.',
        '가사와 음악의 정서, 타깃 시청자, 오디오 QC 결과를 보존하세요.',
        '특정 이미지·영상 생성 서비스의 전용 파라미터는 포함하지 마세요.',
        '정의된 JSON 스키마만 반환하세요.',
      ].join(' '),
      prompt: promptText,
      responseJsonSchema: this.schema(),
      maxOutputTokens,
    });

    return {
      data: result.data as unknown as VideoConcept,
      promptText,
      parameters: {
        schema_version: 'EF-08-V1',
        temperature_policy: production ? 'quality' : 'economy',
        max_output_tokens: maxOutputTokens,
      },
      generationInfo: {
        provider: result.generationInfo.provider,
        model: result.generationInfo.model,
        usage: result.generationInfo.usage,
      },
    };
  }

  private buildPrompt(sources: VideoConceptSources, runMode: string): string {
    return [
      '다음 승인 데이터를 사용해 Music Video Concept을 설계하세요.',
      `실행 모드: ${runMode}`,
      '',
      '필수 원칙:',
      '- schema_version은 EF-08-V1로 고정합니다.',
      '- 가사에 없는 사건이나 메시지를 핵심 서사로 임의 추가하지 않습니다.',
      '- 중장년층이 편안하게 공감할 수 있는 명료한 감정선과 현실적인 장면을 우선합니다.',
      '- EF-09가 장면 단위 스토리보드로 확장할 수 있도록 key_scenes를 시간 순서대로 작성합니다.',
      '- 음악 구간과 화면 변화의 연결을 music_sync에 구체적으로 기록합니다.',
      '- 인물 외형과 공간, 색감의 연속성 규칙을 production_constraints에 명시합니다.',
      '- 저작권이 있는 작품명, 브랜드, 유명인, 특정 감독의 고유 스타일을 모방하지 않습니다.',
      '',
      'Content:',
      JSON.stringify(sources.content, null, 2),
      '',
      'EF-01 Context:',
      JSON.stringify(sources.context, null, 2),
      '',
      'EF-02 Lyrics:',
      JSON.stringify(sources.lyrics, null, 2),
      '',
      'EF-03 Music Specification:',
      JSON.stringify(sources.musicSpec, null, 2),
      '',
      'EF-04 Composition Plan:',
      JSON.stringify(sources.compositionPlan, null, 2),
      '',
      'EF-05 Provider Package:',
      JSON.stringify(sources.providerPackage, null, 2),
      '',
      'EF-06 Audio Generation:',
      JSON.stringify(sources.audioGeneration, null, 2),
      '',
      'EF-07 Approved Audio Review:',
      JSON.stringify(sources.audioReview, null, 2),
    ].join('\n');
  }

  private schema(): Record<string, unknown> {
    const stringArray = { type: 'array', items: { type: 'string' } };
    return {
      type: 'object',
      properties: {
        schema_version: { type: 'string', enum: ['EF-08-V1'] },
        title: { type: 'string' },
        logline: { type: 'string' },
        core_message: { type: 'string' },
        target_audience: { type: 'string' },
        visual_style: {
          type: 'object',
          properties: {
            genre: { type: 'string' },
            tone: { type: 'string' },
            color_palette: stringArray,
            lighting: { type: 'string' },
            camera_language: { type: 'string' },
            aspect_ratio: { type: 'string' },
          },
          required: ['genre', 'tone', 'color_palette', 'lighting', 'camera_language', 'aspect_ratio'],
          additionalProperties: false,
        },
        narrative: {
          type: 'object',
          properties: {
            setting: { type: 'string' },
            protagonist: { type: 'string' },
            emotional_arc: { type: 'string' },
            opening: { type: 'string' },
            development: { type: 'string' },
            climax: { type: 'string' },
            ending: { type: 'string' },
          },
          required: ['setting', 'protagonist', 'emotional_arc', 'opening', 'development', 'climax', 'ending'],
          additionalProperties: false,
        },
        music_sync: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              section: { type: 'string' },
              visual_intent: { type: 'string' },
              transition: { type: 'string' },
            },
            required: ['section', 'visual_intent', 'transition'],
            additionalProperties: false,
          },
        },
        key_scenes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              order: { type: 'integer' },
              name: { type: 'string' },
              description: { type: 'string' },
              emotion: { type: 'string' },
              location: { type: 'string' },
              time_of_day: { type: 'string' },
            },
            required: ['order', 'name', 'description', 'emotion', 'location', 'time_of_day'],
            additionalProperties: false,
          },
        },
        production_constraints: {
          type: 'object',
          properties: {
            must_preserve: stringArray,
            avoid: stringArray,
            continuity_rules: stringArray,
          },
          required: ['must_preserve', 'avoid', 'continuity_rules'],
          additionalProperties: false,
        },
      },
      required: [
        'schema_version', 'title', 'logline', 'core_message', 'target_audience',
        'visual_style', 'narrative', 'music_sync', 'key_scenes', 'production_constraints',
      ],
      additionalProperties: false,
    };
  }
}
