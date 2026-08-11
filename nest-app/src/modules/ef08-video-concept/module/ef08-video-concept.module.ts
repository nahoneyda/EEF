import { Module } from '@nestjs/common';
import { WorkflowModule } from '../../../common/workflow/workflow.module';
import { GenerateVideoConceptUseCase } from '../application/use-cases/generate-video-concept.use-case';
import { VideoConceptRepository } from '../domain/repositories/video-concept.repository';
import { VideoConceptGenerator } from '../domain/services/video-concept-generator.service';
import { GeminiVideoConceptGenerator } from '../infrastructure/gemini-video-concept.generator';
import { SupabaseVideoConceptRepository } from '../infrastructure/supabase-video-concept.repository';

@Module({
  imports: [WorkflowModule],
  providers: [
    GenerateVideoConceptUseCase,
    { provide: VideoConceptRepository, useClass: SupabaseVideoConceptRepository },
    { provide: VideoConceptGenerator, useClass: GeminiVideoConceptGenerator },
  ],
  exports: [GenerateVideoConceptUseCase],
})
export class Ef08VideoConceptModule {}
