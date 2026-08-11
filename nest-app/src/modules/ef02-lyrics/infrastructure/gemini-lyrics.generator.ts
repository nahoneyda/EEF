import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GoogleAiService } from '../../../common/ai/google-ai.service';
import { ModelRegistryService } from '../../../common/ai/model-registry.service';

import {
  LyricsGenerationResult,
  LyricsGenerator,
} from '../domain/services/lyrics-generator.service';

import { Ef01ContextData } from '../domain/repositories/lyrics.repository';
import { LYRIC_SECTION_NAMES } from '../domain/entities/lyrics.entity';

@Injectable()
export class GeminiLyricsGenerator
  extends LyricsGenerator
{
  constructor(
    private readonly googleAi:
      GoogleAiService,
    private readonly models:
      ModelRegistryService,
    private readonly config:
      ConfigService,
  ) {
    super();
  }

  async generate(
    context: Ef01ContextData,
    runMode: string,
  ): Promise<LyricsGenerationResult> {
    const model =
      this.models
        .getGoogleModels(runMode)
        .lyrics;

    const result =
      await this.googleAi
        .generateStructuredJson({
          model,
          systemInstruction:
            [
              '당신은 한국 대중음악 전문 작사가입니다.',
              '사용자가 제공한 EF-01 컨텍스트를 정확히 따르세요.',
              '완전히 새로운 가사를 작성하세요.',
              '특정 가수, 작사가, 기존 곡의 문체나 가사를 모방하지 마세요.',
              '정의된 JSON 스키마에 맞는 결과만 생성하세요.',
            ].join(' '),
          prompt:
            this.buildPrompt(context),
          responseJsonSchema:
            this.buildJsonSchema(),
          maxOutputTokens:
            Number(
              this.config.get<string>(
                'GEMINI_LYRICS_MAX_OUTPUT_TOKENS',
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
    context: Ef01ContextData,
  ): string {
    return [
      '다음 EF-01 프로젝트 컨텍스트를 바탕으로',
      '완전히 새로운 한국어 대중가요 가사를 작성하세요.',
      '',
      '작성 규칙:',
      '- 특정 기존 노래의 가사나 후렴을 인용하지 마세요.',
      '- 특정 가수나 작사가의 스타일을 모방하지 마세요.',
      '- 한국어 청중이 자연스럽게 이해할 수 있는 표현을 사용하세요.',
      '- 각 Verse는 서로 다른 장면으로 전개하세요.',
      '- Chorus는 기억하기 쉬운 핵심 메시지를 가져야 합니다.',
      '- Bridge는 곡의 감정적 전환점 역할을 해야 합니다.',
      '- targetDurationSeconds를 고려하여 충분한 가사 분량을 작성하세요.',
      '- lyrics 각 필드에는 섹션명 자체를 쓰지 마세요.',
      '',
      'EF-01 Context:',
      JSON.stringify(context, null, 2),
    ].join('\n');
  }

  private buildJsonSchema():
    Record<string, unknown> {
    const lyricProperties:
      Record<string, unknown> = {};

    for (const section of LYRIC_SECTION_NAMES) {
      lyricProperties[section] = {
        type: 'string',
      };
    }

    return {
      type: 'object',
      properties: {
        title_ko: {
          type: 'string',
        },
        title_en: {
          type: 'string',
        },
        concept: {
          type: 'string',
        },
        hook_line: {
          type: 'string',
        },
        lyrics: {
          type: 'object',
          properties: lyricProperties,
          required: [
            ...LYRIC_SECTION_NAMES,
          ],
          additionalProperties: false,
        },
        lyric_keywords: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        language: {
          type: 'string',
          enum: ['ko'],
        },
      },
      required: [
        'title_ko',
        'title_en',
        'concept',
        'hook_line',
        'lyrics',
        'lyric_keywords',
        'language',
      ],
      additionalProperties: false,
    };
  }
}
