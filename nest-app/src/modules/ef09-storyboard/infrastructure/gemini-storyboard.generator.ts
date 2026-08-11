import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAiService } from '../../../common/ai/google-ai.service';
import { ModelRegistryService } from '../../../common/ai/model-registry.service';
import { Storyboard } from '../domain/entities/storyboard.entity';
import { StoryboardSources } from '../domain/repositories/storyboard.repository';
import {
  StoryboardGenerationResult,
  StoryboardGenerator,
} from '../domain/services/storyboard-generator.service';

@Injectable()
export class GeminiStoryboardGenerator extends StoryboardGenerator {
  constructor(
    private readonly googleAi: GoogleAiService,
    private readonly models: ModelRegistryService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async generate(
    sources: StoryboardSources,
    runMode: string,
  ): Promise<StoryboardGenerationResult> {
    const production = runMode === 'PRODUCTION';
    const model =
      this.config.get<string>(
        production
          ? 'GEMINI_STORYBOARD_MODEL_PRODUCTION'
          : 'GEMINI_STORYBOARD_MODEL_TEST',
      ) ?? this.models.getGoogleModels(runMode).lyrics;
    const promptText = this.buildPrompt(sources, runMode);
    const maxOutputTokens = Number(
      this.config.get<string>('GEMINI_STORYBOARD_MAX_OUTPUT_TOKENS') ?? '8192',
    );

    const result = await this.googleAi.generateStructuredJson({
      model,
      systemInstruction: [
        '당신은 한국 대중음악 뮤직비디오의 스토리보드를 설계하는 시니어 콘티 작가이자 촬영감독입니다.',
        'EF-08에서 승인된 뮤직비디오 콘셉트를 장면(scene) 단위로 받아, 각 장면을 촬영 가능한 샷(shot) 단위로 세분화하세요.',
        '다음 단계인 EF-10 이미지 생성이 각 샷의 visual_description을 그대로 이미지 프롬프트로 사용할 수 있도록 구체적이고 시각적으로 작성하세요.',
        '콘셉트의 정서, 색감, 카메라 언어, 연속성 규칙을 보존하세요.',
        '특정 이미지·영상 생성 서비스의 전용 파라미터는 포함하지 마세요.',
        '정의된 JSON 스키마만 반환하세요.',
      ].join(' '),
      prompt: promptText,
      responseJsonSchema: this.schema(),
      maxOutputTokens,
    });

    return {
      data: result.data as unknown as Storyboard,
      promptText,
      parameters: {
        schema_version: 'EF-09-V1',
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

  private buildPrompt(sources: StoryboardSources, runMode: string): string {
    return [
      '다음 승인 데이터를 사용해 뮤직비디오 스토리보드(Storyboard)를 설계하세요.',
      `실행 모드: ${runMode}`,
      '',
      '필수 원칙:',
      '- schema_version은 EF-09-V1로 고정합니다.',
      '- EF-08 콘셉트의 key_scenes를 기반으로 scenes를 구성하고, scene_order는 시간 순서를 따릅니다.',
      '- 각 scene은 1개 이상의 shot으로 세분화하며, shot_id는 "S01-C01" 형식(장면번호-컷번호)으로 부여합니다.',
      '- 각 shot의 duration_sec 합계가 total_duration_sec(EF-01/EF-03의 목표 재생시간)에 최대한 근접하도록 배분합니다.',
      '- shot.visual_description은 인물, 공간, 행동, 분위기를 담아 EF-10이 이미지로 바로 생성할 수 있게 구체적으로 작성합니다.',
      '- shot.music_cue는 EF-08 music_sync의 section(intro, verse_1, chorus_1 등)과 연결합니다.',
      '- global_style에는 EF-08 visual_style과 production_constraints(continuity_rules, avoid)를 계승해 전체 연속성을 보장합니다.',
      '- 가사에 없는 사건이나 메시지를 핵심 서사로 임의 추가하지 않습니다.',
      '- 중장년층이 편안하게 공감할 수 있는 명료한 감정선과 현실적인 장면을 우선합니다.',
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
      'EF-08 Music Video Concept:',
      JSON.stringify(sources.videoConcept, null, 2),
    ].join('\n');
  }

  private schema(): Record<string, unknown> {
    const stringArray = { type: 'array', items: { type: 'string' } };
    return {
      type: 'object',
      properties: {
        schema_version: { type: 'string', enum: ['EF-09-V1'] },
        title: { type: 'string' },
        aspect_ratio: { type: 'string' },
        total_duration_sec: { type: 'number' },
        global_style: {
          type: 'object',
          properties: {
            genre: { type: 'string' },
            tone: { type: 'string' },
            color_palette: stringArray,
            lighting: { type: 'string' },
            camera_language: { type: 'string' },
            continuity_rules: stringArray,
            avoid: stringArray,
          },
          required: [
            'genre',
            'tone',
            'color_palette',
            'lighting',
            'camera_language',
            'continuity_rules',
            'avoid',
          ],
          additionalProperties: false,
        },
        scenes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              scene_order: { type: 'integer' },
              scene_name: { type: 'string' },
              location: { type: 'string' },
              time_of_day: { type: 'string' },
              emotion: { type: 'string' },
              shots: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    shot_order: { type: 'integer' },
                    shot_id: { type: 'string' },
                    duration_sec: { type: 'number' },
                    shot_size: { type: 'string' },
                    camera_angle: { type: 'string' },
                    camera_movement: { type: 'string' },
                    composition: { type: 'string' },
                    subject_action: { type: 'string' },
                    visual_description: { type: 'string' },
                    lighting: { type: 'string' },
                    color_mood: { type: 'string' },
                    music_cue: { type: 'string' },
                    transition_out: { type: 'string' },
                  },
                  required: [
                    'shot_order',
                    'shot_id',
                    'duration_sec',
                    'shot_size',
                    'camera_angle',
                    'camera_movement',
                    'composition',
                    'subject_action',
                    'visual_description',
                    'lighting',
                    'color_mood',
                    'music_cue',
                    'transition_out',
                  ],
                  additionalProperties: false,
                },
              },
            },
            required: [
              'scene_order',
              'scene_name',
              'location',
              'time_of_day',
              'emotion',
              'shots',
            ],
            additionalProperties: false,
          },
        },
      },
      required: [
        'schema_version',
        'title',
        'aspect_ratio',
        'total_duration_sec',
        'global_style',
        'scenes',
      ],
      additionalProperties: false,
    };
  }
}
