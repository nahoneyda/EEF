import { Module } from '@nestjs/common';

import { WorkflowModule } from '../workflow/workflow.module';

import { Ef01ContextExecutor } from '../../modules/ef01-context/application/executors/ef01-context.executor';
import { Ef01ContextModule } from '../../modules/ef01-context/module/ef01-context.module';

import { Ef02LyricsExecutor } from '../../modules/ef02-lyrics/application/executors/ef02-lyrics.executor';
import { Ef02LyricsModule } from '../../modules/ef02-lyrics/module/ef02-lyrics.module';

import { Ef03MusicSpecExecutor } from '../../modules/ef03-music-spec/application/executors/ef03-music-spec.executor';
import { Ef03MusicSpecModule } from '../../modules/ef03-music-spec/module/ef03-music-spec.module';

import { Ef04CompositionPlanExecutor } from '../../modules/ef04-composition-plan/application/executors/ef04-composition-plan.executor';
import { Ef04CompositionPlanModule } from '../../modules/ef04-composition-plan/module/ef04-composition-plan.module';

import { Ef05ProviderPackageExecutor } from '../../modules/ef05-provider-package/application/executors/ef05-provider-package.executor';
import { Ef05ProviderPackageModule } from '../../modules/ef05-provider-package/module/ef05-provider-package.module';

import { Ef06AudioGenerationExecutor } from '../../modules/ef06-audio-generation/application/executors/ef06-audio-generation.executor';
import { Ef06AudioGenerationModule } from '../../modules/ef06-audio-generation/module/ef06-audio-generation.module';

import { Ef07AudioQcExecutor } from '../../modules/ef07-audio-qc/application/executors/ef07-audio-qc.executor';
import { Ef07AudioQcModule } from '../../modules/ef07-audio-qc/module/ef07-audio-qc.module';

import { Ef08VideoConceptExecutor } from '../../modules/ef08-video-concept/application/executors/ef08-video-concept.executor';
import { Ef08VideoConceptModule } from '../../modules/ef08-video-concept/module/ef08-video-concept.module';

import { Ef09StoryboardExecutor } from '../../modules/ef09-storyboard/application/executors/ef09-storyboard.executor';
import { Ef09StoryboardModule } from '../../modules/ef09-storyboard/module/ef09-storyboard.module';

import { Ef10ImageGenerationExecutor } from '../../modules/ef10-image-generation/application/executors/ef10-image-generation.executor';
import { Ef10ImageGenerationModule } from '../../modules/ef10-image-generation/module/ef10-image-generation.module';

import {
  EF01_EXECUTOR,
  EF02_EXECUTOR,
  EF03_EXECUTOR,
  EF04_EXECUTOR,
  EF05_EXECUTOR,
  EF06_EXECUTOR,
  EF07_EXECUTOR,
  EF08_EXECUTOR,
  EF09_EXECUTOR,
  EF10_EXECUTOR,
  ExecutorRegistry,
} from './executor.registry';

import { WorkerController } from './worker.controller';
import { WorkerService } from './worker.service';

@Module({
  imports: [
    WorkflowModule,
    Ef01ContextModule,
    Ef02LyricsModule,
    Ef03MusicSpecModule,
    Ef04CompositionPlanModule,
    Ef05ProviderPackageModule,
    Ef06AudioGenerationModule,
    Ef07AudioQcModule,
    Ef08VideoConceptModule,
    Ef09StoryboardModule,
    Ef10ImageGenerationModule,
  ],
  controllers: [WorkerController],
  providers: [
    Ef01ContextExecutor,
    Ef02LyricsExecutor,
    Ef03MusicSpecExecutor,
    Ef04CompositionPlanExecutor,
    Ef05ProviderPackageExecutor,
    Ef06AudioGenerationExecutor,
    Ef07AudioQcExecutor,
    Ef08VideoConceptExecutor,
    Ef09StoryboardExecutor,
    Ef10ImageGenerationExecutor,

    {
      provide: EF01_EXECUTOR,
      useExisting: Ef01ContextExecutor,
    },
    {
      provide: EF02_EXECUTOR,
      useExisting: Ef02LyricsExecutor,
    },
    {
      provide: EF03_EXECUTOR,
      useExisting: Ef03MusicSpecExecutor,
    },
    {
      provide: EF04_EXECUTOR,
      useExisting: Ef04CompositionPlanExecutor,
    },
    {
      provide: EF05_EXECUTOR,
      useExisting: Ef05ProviderPackageExecutor,
    },
    {
      provide: EF06_EXECUTOR,
      useExisting: Ef06AudioGenerationExecutor,
    },
    {
      provide: EF07_EXECUTOR,
      useExisting: Ef07AudioQcExecutor,
    },
    {
      provide: EF08_EXECUTOR,
      useExisting: Ef08VideoConceptExecutor,
    },
    {
      provide: EF09_EXECUTOR,
      useExisting: Ef09StoryboardExecutor,
    },
    {
      provide: EF10_EXECUTOR,
      useExisting: Ef10ImageGenerationExecutor,
    },

    ExecutorRegistry,
    WorkerService,
  ],
  exports: [WorkerService, ExecutorRegistry],
})
export class WorkerModule {}
