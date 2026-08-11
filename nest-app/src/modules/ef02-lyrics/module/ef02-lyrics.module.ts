import { Module } from '@nestjs/common';

import { WorkflowModule } from '../../../common/workflow/workflow.module';

import { LyricsRepository } from '../domain/repositories/lyrics.repository';
import { LyricsGenerator } from '../domain/services/lyrics-generator.service';
import { LyricsValidatorService } from '../domain/services/lyrics-validator.service';

import { SupabaseLyricsRepository } from '../infrastructure/supabase-lyrics.repository';
import { GeminiLyricsGenerator } from '../infrastructure/gemini-lyrics.generator';

import { GenerateLyricsUseCase } from '../application/use-cases/generate-lyrics.use-case';

@Module({
  imports: [
    WorkflowModule,
  ],
  providers: [
    LyricsValidatorService,
    GenerateLyricsUseCase,
    {
      provide:
        LyricsRepository,
      useClass:
        SupabaseLyricsRepository,
    },
    {
      provide:
        LyricsGenerator,
      useClass:
        GeminiLyricsGenerator,
    },
  ],
  exports: [
    GenerateLyricsUseCase,
  ],
})
export class Ef02LyricsModule {}
