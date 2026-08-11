import { Module } from '@nestjs/common';

import { WorkflowModule } from '../../../common/workflow/workflow.module';

import { MusicSpecRepository } from '../domain/repositories/music-spec.repository';
import { MusicSpecGenerator } from '../domain/services/music-spec-generator.service';
import { MusicSpecValidatorService } from '../domain/services/music-spec-validator.service';

import { SupabaseMusicSpecRepository } from '../infrastructure/supabase-music-spec.repository';
import { GeminiMusicSpecGenerator } from '../infrastructure/gemini-music-spec.generator';

import { GenerateMusicSpecUseCase } from '../application/use-cases/generate-music-spec.use-case';

@Module({
  imports: [
    WorkflowModule,
  ],
  providers: [
    MusicSpecValidatorService,
    GenerateMusicSpecUseCase,
    {
      provide: MusicSpecRepository,
      useClass: SupabaseMusicSpecRepository,
    },
    {
      provide: MusicSpecGenerator,
      useClass: GeminiMusicSpecGenerator,
    },
  ],
  exports: [
    GenerateMusicSpecUseCase,
  ],
})
export class Ef03MusicSpecModule {}
