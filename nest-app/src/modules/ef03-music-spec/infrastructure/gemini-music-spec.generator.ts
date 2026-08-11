import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GoogleAiService } from '../../../common/ai/google-ai.service';
import { ModelRegistryService } from '../../../common/ai/model-registry.service';

import {
  MusicSpecGenerationResult,
  MusicSpecGenerator,
} from '../domain/services/music-spec-generator.service';

import {
  Ef02LyricsData,
  Ef03ContextData,
} from '../domain/repositories/music-spec.repository';

@Injectable()
export class GeminiMusicSpecGenerator
  extends MusicSpecGenerator
{
  constructor(
    private readonly googleAi: GoogleAiService,
    private readonly models: ModelRegistryService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async generate(
    context: Ef03ContextData,
    lyrics: Ef02LyricsData,
    runMode: string,
  ): Promise<MusicSpecGenerationResult> {
    const production =
      String(runMode).trim().toUpperCase() === 'PRODUCTION';

    const model =
      this.config.get<string>(
        production
          ? 'GEMINI_MUSIC_SPEC_MODEL_PRODUCTION'
          : 'GEMINI_MUSIC_SPEC_MODEL_TEST',
      ) ??
      this.models.getGoogleModels(runMode).lyrics;

    const result =
      await this.googleAi.generateStructuredJson({
        model,
        systemInstruction: [
          '당신은 작곡, 편곡, 보컬 디렉팅, 믹싱에 숙련된 음악 프로듀서입니다.',
          'EF-01 컨텍스트와 EF-02 가사를 분석해 provider-independent Music Specification을 설계하세요.',
          'Lyria, Suno, Udio 등 특정 서비스 이름이나 전용 파라미터를 결과에 포함하지 마세요.',
          '정의된 JSON 스키마만 반환하세요.',
        ].join(' '),
        prompt: this.buildPrompt(context, lyrics),
        responseJsonSchema: this.schema(),
        maxOutputTokens: Number(
          this.config.get<string>(
            'GEMINI_MUSIC_SPEC_MAX_OUTPUT_TOKENS',
          ) ?? '8192',
        ),
      });

    return {
      data: result.data,
      generationInfo: {
        ...result.generationInfo,
      },
    };
  }

  private buildPrompt(
    context: Ef03ContextData,
    lyrics: Ef02LyricsData,
  ): string {
    return [
      '아래 정보를 바탕으로 실제 제작 가능한 Music Specification을 작성하세요.',
      '',
      '설계 원칙:',
      '- 가사의 감정선과 후렴의 기억성을 우선합니다.',
      '- EF-01의 장르, BPM, Key는 참고하되 음악적으로 필요하면 합리적으로 조정할 수 있습니다.',
      '- 중장년층이 편안하게 들을 수 있는 가독성과 멜로디 전달력을 고려합니다.',
      '- instrumentation의 avoid에는 피해야 할 음색이나 과도한 요소를 구체적으로 적습니다.',
      '- acoustic_ratio와 electronic_ratio는 각각 0~1이며 가급적 합이 1에 가깝게 설계합니다.',
      '- energy, valence, danceability는 0~1 범위입니다.',
      '',
      'EF-01 Context:',
      JSON.stringify(context, null, 2),
      '',
      'EF-02 Lyrics:',
      JSON.stringify(lyrics, null, 2),
    ].join('\n');
  }

  private schema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        genre: { type: 'string' },
        subgenre: { type: 'string' },
        bpm: { type: 'integer' },
        musical_key: { type: 'string' },
        time_signature: { type: 'string' },
        target_duration_sec: { type: 'integer' },
        energy: { type: 'number' },
        valence: { type: 'number' },
        danceability: { type: 'number' },
        mood: {
          type: 'array',
          items: { type: 'string' },
        },
        instrumentation: {
          type: 'object',
          properties: {
            primary: {
              type: 'array',
              items: { type: 'string' },
            },
            secondary: {
              type: 'array',
              items: { type: 'string' },
            },
            avoid: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['primary', 'secondary', 'avoid'],
          additionalProperties: false,
        },
        vocal_spec: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            gender_character: { type: 'string' },
            age_character: { type: 'string' },
            tone: { type: 'string' },
            range: { type: 'string' },
            delivery: { type: 'string' },
            vibrato: { type: 'string' },
            harmony: { type: 'string' },
          },
          required: [
            'type',
            'gender_character',
            'age_character',
            'tone',
            'range',
            'delivery',
            'vibrato',
            'harmony',
          ],
          additionalProperties: false,
        },
        arrangement: {
          type: 'object',
          properties: {
            intro: { type: 'string' },
            verse: { type: 'string' },
            pre_chorus: { type: 'string' },
            chorus: { type: 'string' },
            bridge: { type: 'string' },
            final_chorus: { type: 'string' },
            ending: { type: 'string' },
          },
          required: [
            'intro',
            'verse',
            'pre_chorus',
            'chorus',
            'bridge',
            'final_chorus',
            'ending',
          ],
          additionalProperties: false,
        },
        production_style: {
          type: 'object',
          properties: {
            overall: { type: 'string' },
            acoustic_ratio: { type: 'number' },
            electronic_ratio: { type: 'number' },
            dynamic_range: { type: 'string' },
            mix_character: { type: 'string' },
            reverb: { type: 'string' },
            mastering_character: { type: 'string' },
          },
          required: [
            'overall',
            'acoustic_ratio',
            'electronic_ratio',
            'dynamic_range',
            'mix_character',
            'reverb',
            'mastering_character',
          ],
          additionalProperties: false,
        },
        generation_constraints: {
          type: 'object',
          properties: {
            must_preserve: {
              type: 'array',
              items: { type: 'string' },
            },
            avoid: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['must_preserve', 'avoid'],
          additionalProperties: false,
        },
      },
      required: [
        'genre',
        'subgenre',
        'bpm',
        'musical_key',
        'time_signature',
        'target_duration_sec',
        'energy',
        'valence',
        'danceability',
        'mood',
        'instrumentation',
        'vocal_spec',
        'arrangement',
        'production_style',
        'generation_constraints',
      ],
      additionalProperties: false,
    };
  }
}
