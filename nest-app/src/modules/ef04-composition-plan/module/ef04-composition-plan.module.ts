import { Module } from '@nestjs/common';

import { WorkflowModule } from '../../../common/workflow/workflow.module';

import { CompositionPlanRepository } from '../domain/repositories/composition-plan.repository';
import { CompositionPlanGenerator } from '../domain/services/composition-plan-generator.service';
import { CompositionPlanValidatorService } from '../domain/services/composition-plan-validator.service';
import { CompositionPlanNormalizerService } from '../domain/services/composition-plan-normalizer.service';

import { SupabaseCompositionPlanRepository } from '../infrastructure/supabase-composition-plan.repository';
import { GeminiCompositionPlanGenerator } from '../infrastructure/gemini-composition-plan.generator';

import { GenerateCompositionPlanUseCase } from '../application/use-cases/generate-composition-plan.use-case';

@Module({
  imports: [
    WorkflowModule,
  ],

  providers: [
    CompositionPlanValidatorService,
    CompositionPlanNormalizerService,
    GenerateCompositionPlanUseCase,

    {
      provide:
        CompositionPlanRepository,

      useClass:
        SupabaseCompositionPlanRepository,
    },

    {
      provide:
        CompositionPlanGenerator,

      useClass:
        GeminiCompositionPlanGenerator,
    },
  ],

  exports: [
    GenerateCompositionPlanUseCase,
  ],
})
export class Ef04CompositionPlanModule {}
