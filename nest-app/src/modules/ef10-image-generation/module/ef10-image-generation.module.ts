import { Module } from '@nestjs/common';
import { WorkflowModule } from '../../../common/workflow/workflow.module';
import { GenerateImagesUseCase } from '../application/use-cases/generate-images.use-case';
import { ImageGenerationRepository } from '../domain/repositories/image-generation.repository';
import {
  ImageProvider,
  ImageStorage,
} from '../domain/services/image-services';
import { SupabaseImageGenerationRepository } from '../infrastructure/supabase-image-generation.repository';
import { GoogleImagenProvider } from '../infrastructure/google/google-imagen.provider';
import { SupabaseImageStorageService } from '../infrastructure/storage/supabase-image-storage.service';

@Module({
  imports: [WorkflowModule],
  providers: [
    GenerateImagesUseCase,
    {
      provide: ImageGenerationRepository,
      useClass: SupabaseImageGenerationRepository,
    },
    { provide: ImageProvider, useClass: GoogleImagenProvider },
    { provide: ImageStorage, useClass: SupabaseImageStorageService },
  ],
  exports: [GenerateImagesUseCase],
})
export class Ef10ImageGenerationModule {}
