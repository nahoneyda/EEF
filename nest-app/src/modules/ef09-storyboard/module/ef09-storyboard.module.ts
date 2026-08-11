import { Module } from '@nestjs/common';
import { WorkflowModule } from '../../../common/workflow/workflow.module';
import { GenerateStoryboardUseCase } from '../application/use-cases/generate-storyboard.use-case';
import { StoryboardRepository } from '../domain/repositories/storyboard.repository';
import { StoryboardGenerator } from '../domain/services/storyboard-generator.service';
import { GeminiStoryboardGenerator } from '../infrastructure/gemini-storyboard.generator';
import { SupabaseStoryboardRepository } from '../infrastructure/supabase-storyboard.repository';

@Module({
  imports: [WorkflowModule],
  providers: [
    GenerateStoryboardUseCase,
    { provide: StoryboardRepository, useClass: SupabaseStoryboardRepository },
    { provide: StoryboardGenerator, useClass: GeminiStoryboardGenerator },
  ],
  exports: [GenerateStoryboardUseCase],
})
export class Ef09StoryboardModule {}
