import { Module } from '@nestjs/common';
import { WorkflowModule } from '../../../common/workflow/workflow.module';
import { AudioGenerationRepository } from '../domain/repositories/audio-generation.repository';
import { AudioProvider } from '../domain/services/audio-provider.service';
import { AudioStorage } from '../domain/services/audio-storage.service';
import { SupabaseAudioGenerationRepository } from '../infrastructure/supabase-audio-generation.repository';
import { GoogleLyriaAudioProvider } from '../infrastructure/google/google-lyria-audio.provider';
import { SupabaseAudioStorageService } from '../infrastructure/storage/supabase-audio-storage.service';
import { GenerateAudioUseCase } from '../application/use-cases/generate-audio.use-case';

@Module({
  imports:[WorkflowModule],
  providers:[
    GenerateAudioUseCase,
    {provide:AudioGenerationRepository,useClass:SupabaseAudioGenerationRepository},
    {provide:AudioProvider,useClass:GoogleLyriaAudioProvider},
    {provide:AudioStorage,useClass:SupabaseAudioStorageService},
  ],
  exports:[GenerateAudioUseCase],
})
export class Ef06AudioGenerationModule {}
