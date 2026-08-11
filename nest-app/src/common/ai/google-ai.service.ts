import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GenerateStructuredJsonInput {
  model: string;
  systemInstruction: string;
  prompt: string;
  responseJsonSchema: Record<string, unknown>;
  maxOutputTokens?: number;
}

export interface GoogleGenerationInfo {
  provider: 'google';
  model: string;
  usage: Record<string, unknown>;
  promptFeedback: Record<string, unknown>;
}

export interface GenerateStructuredJsonResult {
  data: Record<string, unknown>;
  generationInfo: GoogleGenerationInfo;
  raw: Record<string, unknown>;
}

@Injectable()
export class GoogleAiService {
  private readonly logger =
    new Logger(GoogleAiService.name);

  constructor(
    private readonly config: ConfigService,
  ) {}

  async generateStructuredJson(
    input: GenerateStructuredJsonInput,
  ): Promise<GenerateStructuredJsonResult> {
    const apiKey =
      this.config.get<string>('GEMINI_API_KEY') ??
      this.config.get<string>('GOOGLE_API_KEY');

    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY or GOOGLE_API_KEY is required',
      );
    }

    const timeoutMs =
      Number(
        this.config.get<string>(
          'GEMINI_TIMEOUT_SECONDS',
        ) ?? '180',
      ) * 1000;

    const controller = new AbortController();
    const timeout =
      setTimeout(
        () => controller.abort(),
        timeoutMs,
      );

    try {
      const url =
        'https://generativelanguage.googleapis.com/' +
        `v1beta/models/${encodeURIComponent(input.model)}` +
        ':generateContent';

      this.logger.log(
        `Google AI request model=${input.model}`,
      );

      const response =
        await fetch(url, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: input.systemInstruction,
                },
              ],
            },
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: input.prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              responseJsonSchema:
                input.responseJsonSchema,
              maxOutputTokens:
                input.maxOutputTokens ?? 8192,
            },
          }),
        });

      const responseText =
        await response.text();

      if (!response.ok) {
        throw new Error(
          [
            'Google generateContent failed',
            `status=${response.status}`,
            responseText.substring(0, 1500),
          ].join(' '),
        );
      }

      let payload: Record<string, unknown>;

      try {
        payload =
          JSON.parse(responseText) as Record<string, unknown>;
      } catch {
        throw new Error(
          'Google AI response was not valid JSON',
        );
      }

      const promptFeedback =
        this.objectValue(payload.promptFeedback);

      const blockReason =
        promptFeedback.blockReason;

      if (
        typeof blockReason === 'string' &&
        blockReason
      ) {
        throw new Error(
          `Google AI blocked prompt: ${blockReason}`,
        );
      }

      const outputText =
        this.extractOutputText(payload);

      let generated: Record<string, unknown>;

      try {
        generated =
          JSON.parse(outputText) as Record<string, unknown>;
      } catch {
        throw new Error(
          'Google AI generated output was not valid JSON',
        );
      }

      const model =
        typeof payload.modelVersion === 'string'
          ? payload.modelVersion
          : input.model;

      return {
        data: generated,
        generationInfo: {
          provider: 'google',
          model,
          usage:
            this.objectValue(payload.usageMetadata),
          promptFeedback,
        },
        raw: payload,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'AbortError'
      ) {
        throw new Error(
          `Google AI request timeout after ${timeoutMs}ms`,
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractOutputText(
    payload: Record<string, unknown>,
  ): string {
    const candidates = payload.candidates;

    if (!Array.isArray(candidates)) {
      throw new Error(
        'Google AI response has no candidates',
      );
    }

    for (const candidate of candidates) {
      const candidateObject =
        this.objectValue(candidate);

      const content =
        this.objectValue(candidateObject.content);

      const parts = content.parts;

      if (!Array.isArray(parts)) {
        continue;
      }

      for (const part of parts) {
        const partObject =
          this.objectValue(part);

        if (
          typeof partObject.text === 'string' &&
          partObject.text.trim()
        ) {
          return partObject.text;
        }
      }
    }

    throw new Error(
      'Google AI response did not contain output text',
    );
  }

  private objectValue(
    value: unknown,
  ): Record<string, unknown> {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      return value as Record<string, unknown>;
    }

    return {};
  }
}
