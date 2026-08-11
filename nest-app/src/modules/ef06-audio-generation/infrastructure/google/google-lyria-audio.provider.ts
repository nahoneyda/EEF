import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { AudioProvider } from '../../domain/services/audio-provider.service';
import { AudioProviderResult } from '../../domain/entities/audio-generation.entity';

@Injectable()
export class GoogleLyriaAudioProvider extends AudioProvider {
  readonly provider = 'GOOGLE_LYRIA';
  constructor(private readonly config: ConfigService) { super(); }

  async generate(input: {model: string; prompt: string; outputFormat: string;}): Promise<AudioProviderResult> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY') ?? this.config.get<string>('GOOGLE_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is required');

    const ai = new GoogleGenAI({ apiKey });
    const timeoutMs = Number(this.config.get<string>('EF06_GENERATION_TIMEOUT_SECONDS') ?? '300') * 1000;
    const started = Date.now();

    const interaction = await this.withTimeout(
      ai.interactions.create({
        model: input.model,
        input: input.prompt,
        response_format: { type: 'audio' },
      }),
      timeoutMs,
    );

    const generatedAudio = interaction.output_audio;
    if (!generatedAudio?.data) throw new Error('Lyria response did not contain output_audio.data');

    const audio = Buffer.from(generatedAudio.data, 'base64');
    if (!audio.length) throw new Error('Lyria returned empty audio');

    const format = input.outputFormat.toLowerCase() === 'wav' ? 'wav' : 'mp3';
    const record = interaction as unknown as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id : undefined;

    return {
      provider: this.provider,
      model: input.model,
      providerGenerationId: id,
      audio,
      mimeType: format === 'wav' ? 'audio/wav' : 'audio/mpeg',
      extension: format,
      outputText: typeof interaction.output_text === 'string' ? interaction.output_text : undefined,
      rawMetadata: {
        interaction_id: id ?? null,
        audio_bytes: audio.length,
        output_text: typeof interaction.output_text === 'string' ? interaction.output_text : null,
      },
      generationTimeSeconds: Number(((Date.now() - started) / 1000).toFixed(3)),
    };
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Lyria timeout after ${ms}ms`)), ms);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
