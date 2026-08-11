import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GoogleAiService } from '../../../common/ai/google-ai.service';

import {
  CompositionPlanGenerationResult,
  CompositionPlanGenerator,
} from '../domain/services/composition-plan-generator.service';

import {
  Ef04LyricsData,
  Ef04MusicSpecData,
} from '../domain/repositories/composition-plan.repository';

@Injectable()
export class GeminiCompositionPlanGenerator
  extends CompositionPlanGenerator
{
  constructor(
    private readonly googleAi:
      GoogleAiService,

    private readonly config:
      ConfigService,
  ) {
    super();
  }

  async generate(
    lyrics: Ef04LyricsData,
    musicSpec: Ef04MusicSpecData,
    runMode: string,
  ): Promise<CompositionPlanGenerationResult> {
    const production =
      String(
        runMode,
      )
        .trim()
        .toUpperCase() ===
      'PRODUCTION';

    const model =
      this.config.get<string>(
        production
          ? 'GEMINI_COMPOSITION_PLAN_MODEL_PRODUCTION'
          : 'GEMINI_COMPOSITION_PLAN_MODEL_TEST',
      ) ??
      (
        production
          ? 'gemini-3.5-flash'
          : 'gemini-3.5-flash-lite'
      );

    const result =
      await this.googleAi
        .generateStructuredJson({
          model,

          systemInstruction:
            [
              '당신은 작곡가, 편곡가, 보컬 디렉터 역할을 수행합니다.',
              'EF-02 가사와 EF-03 MusicSpec을 바탕으로 provider-independent Composition Plan을 설계하세요.',
              'EF-02의 hookLine은 SSOT이며 절대로 새 가사 Hook으로 변경하거나 새 문장을 만들어서는 안 됩니다.',
              'Lyria, Suno, Udio 등 특정 생성 서비스 이름이나 전용 파라미터를 포함하지 마세요.',
              '실제 곡 제작에 활용할 수 있을 정도로 구체적으로 작성하세요.',
              '정의된 JSON 스키마만 반환하세요.',
            ].join(' '),

          prompt:
            this.buildPrompt(
              lyrics,
              musicSpec,
            ),

          responseJsonSchema:
            this.schema(),

          maxOutputTokens:
            Number(
              this.config.get<string>(
                'GEMINI_COMPOSITION_PLAN_MAX_OUTPUT_TOKENS',
              ) ??
              '8192',
            ),
        });

    return {
      data:
        result.data,

      generationInfo: {
        ...result.generationInfo,
      },
    };
  }

  private buildPrompt(
    lyrics: Ef04LyricsData,
    musicSpec: Ef04MusicSpecData,
  ): string {
    return [
      '아래 가사와 MusicSpec을 바탕으로 Composition Plan을 작성하세요.',
      '',
      `전체 목표 길이: 정확히 ${musicSpec.targetDurationSec}초`,
      `정식 lyrical hook: "${lyrics.hookLine}"`,
      '',
      '필수 원칙:',
      `- song_structure의 target_sec 합계는 정확히 ${musicSpec.targetDurationSec}초가 되도록 설계합니다.`,
      '- hook_strategy.lyrical_hook에는 위 정식 lyrical hook을 그대로 사용합니다.',
      '- 새로운 가사 문구를 Hook으로 발명하지 않습니다.',
      '- 후렴은 멜로디와 정식 가사 Hook이 명확해야 합니다.',
      '- Verse와 Chorus의 에너지 대비를 설계합니다.',
      '- instrumentation_cues에는 악기별 등장과 역할을 명시합니다.',
      '- section_timing은 각 주요 섹션의 초 단위 목표 길이를 포함합니다.',
      '- 특정 AI 음악 생성 서비스용 프롬프트는 작성하지 않습니다.',
      '',
      'EF-02 Lyrics:',
      JSON.stringify(
        lyrics,
        null,
        2,
      ),
      '',
      'EF-03 MusicSpec:',
      JSON.stringify(
        musicSpec,
        null,
        2,
      ),
    ].join('\n');
  }

  private schema():
    Record<string, unknown> {
    return {
      type:
        'object',

      properties: {
        title_ko: {
          type:
            'string',
        },

        title_en: {
          type:
            'string',
        },

        language: {
          type:
            'string',
        },

        target_duration_sec: {
          type:
            'integer',
        },

        bpm: {
          type:
            'integer',
        },

        musical_key: {
          type:
            'string',
        },

        time_signature: {
          type:
            'string',
        },

        song_structure: {
          type:
            'array',

          items: {
            type:
              'object',

            properties: {
              section: {
                type:
                  'string',
              },

              order: {
                type:
                  'integer',
              },

              target_sec: {
                type:
                  'integer',
              },

              purpose: {
                type:
                  'string',
              },
            },

            required: [
              'section',
              'order',
              'target_sec',
              'purpose',
            ],

            additionalProperties:
              false,
          },
        },

        section_timing: {
          type:
            'object',

          additionalProperties: {
            type:
              'number',
          },
        },

        harmony_plan: {
          type:
            'object',

          properties: {
            tonal_center: {
              type:
                'string',
            },

            progression_direction: {
              type:
                'array',

              items: {
                type:
                  'string',
              },
            },

            cadence_strategy: {
              type:
                'string',
            },

            harmonic_tension: {
              type:
                'string',
            },
          },

          required: [
            'tonal_center',
            'progression_direction',
            'cadence_strategy',
            'harmonic_tension',
          ],

          additionalProperties:
            false,
        },

        melody_plan: {
          type:
            'object',

          properties: {
            contour: {
              type:
                'string',
            },

            range_strategy: {
              type:
                'string',
            },

            motif_strategy: {
              type:
                'string',
            },

            chorus_lift: {
              type:
                'string',
            },

            climax_strategy: {
              type:
                'string',
            },
          },

          required: [
            'contour',
            'range_strategy',
            'motif_strategy',
            'chorus_lift',
            'climax_strategy',
          ],

          additionalProperties:
            false,
        },

        rhythm_plan: {
          type:
            'object',

          properties: {
            groove: {
              type:
                'string',
            },

            pulse: {
              type:
                'string',
            },

            syncopation: {
              type:
                'string',
            },

            density_curve: {
              type:
                'string',
            },
          },

          required: [
            'groove',
            'pulse',
            'syncopation',
            'density_curve',
          ],

          additionalProperties:
            false,
        },

        vocal_phrasing_plan: {
          type:
            'object',

          properties: {
            verse: {
              type:
                'string',
            },

            pre_chorus: {
              type:
                'string',
            },

            chorus: {
              type:
                'string',
            },

            bridge: {
              type:
                'string',
            },

            final_chorus: {
              type:
                'string',
            },
          },

          required: [
            'verse',
            'pre_chorus',
            'chorus',
            'bridge',
            'final_chorus',
          ],

          additionalProperties:
            false,
        },

        instrumentation_cues: {
          type:
            'array',

          items: {
            type:
              'object',

            properties: {
              instrument: {
                type:
                  'string',
              },

              entry_section: {
                type:
                  'string',
              },

              exit_section: {
                type:
                  'string',
              },

              role: {
                type:
                  'string',
              },
            },

            required: [
              'instrument',
              'entry_section',
              'exit_section',
              'role',
            ],

            additionalProperties:
              false,
          },
        },

        dynamics_plan: {
          type:
            'object',

          properties: {
            opening: {
              type:
                'string',
            },

            development: {
              type:
                'string',
            },

            climax: {
              type:
                'string',
            },

            ending: {
              type:
                'string',
            },
          },

          required: [
            'opening',
            'development',
            'climax',
            'ending',
          ],

          additionalProperties:
            false,
        },

        transition_plan: {
          type:
            'array',

          items: {
            type:
              'object',

            properties: {
              from: {
                type:
                  'string',
              },

              to: {
                type:
                  'string',
              },

              method: {
                type:
                  'string',
              },
            },

            required: [
              'from',
              'to',
              'method',
            ],

            additionalProperties:
              false,
          },
        },

        hook_strategy: {
          type:
            'object',

          properties: {
            lyrical_hook: {
              type:
                'string',
            },

            melodic_hook: {
              type:
                'string',
            },

            repetition_strategy: {
              type:
                'string',
            },

            placement_strategy: {
              type:
                'string',
            },
          },

          required: [
            'lyrical_hook',
            'melodic_hook',
            'repetition_strategy',
            'placement_strategy',
          ],

          additionalProperties:
            false,
        },

        generation_constraints: {
          type:
            'object',

          properties: {
            must_preserve: {
              type:
                'array',

              items: {
                type:
                  'string',
              },
            },

            avoid: {
              type:
                'array',

              items: {
                type:
                  'string',
              },
            },
          },

          required: [
            'must_preserve',
            'avoid',
          ],

          additionalProperties:
            false,
        },
      },

      required: [
        'title_ko',
        'title_en',
        'language',
        'target_duration_sec',
        'bpm',
        'musical_key',
        'time_signature',
        'song_structure',
        'section_timing',
        'harmony_plan',
        'melody_plan',
        'rhythm_plan',
        'vocal_phrasing_plan',
        'instrumentation_cues',
        'dynamics_plan',
        'transition_plan',
        'hook_strategy',
        'generation_constraints',
      ],

      additionalProperties:
        false,
    };
  }
}
