import { Module } from '@nestjs/common';
import { WorkflowModule } from '../../../common/workflow/workflow.module';
import { GenerateVideosUseCase } from '../application/use-cases/generate-videos.use-case';
import { VideoProviderSelector } from '../application/use-cases/build-video-prompt';
import { VideoGenerationRepository } from '../domain/repositories/video-generation.repository';
import { VideoStorage } from '../domain/services/video-services';
import { SupabaseVideoGenerationRepository } from '../infrastructure/supabase-video-generation.repository';
import { SupabaseVideoStorageService } from '../infrastructure/storage/supabase-video-storage.service';
import { MockVideoProvider } from '../infrastructure/google/mock-video.provider';
import { VeoVideoProvider } from '../infrastructure/google/veo-video.provider';

@Module({
  imports: [WorkflowModule],
  providers: [
    GenerateVideosUseCase,
    VideoProviderSelector,
    MockVideoProvider,
    VeoVideoProvider,
    {
      provide: VideoGenerationRepository,
      useClass: SupabaseVideoGenerationRepository,
    },
    { provide: VideoStorage, useClass: SupabaseVideoStorageService },
  ],
  exports: [GenerateVideosUseCase],
})
export class Ef11VideoGenerationModule {}
