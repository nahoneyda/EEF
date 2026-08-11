import { Module } from '@nestjs/common';

import { WorkflowModule } from '../../../common/workflow/workflow.module';

import { ContextBuilderService } from '../domain/services/context-builder.service';

import { ContextRepository } from '../domain/repositories/context.repository';

import { SupabaseContextRepository } from '../infrastructure/supabase-context.repository';

import { GenerateContextUseCase } from '../application/use-cases/generate-context.use-case';

import { Ef01ContextController } from '../presentation/ef01-context.controller';

@Module({
  imports: [WorkflowModule],

  controllers: [Ef01ContextController],

  providers: [
    ContextBuilderService,

    GenerateContextUseCase,

    {
      provide: ContextRepository,

      useClass: SupabaseContextRepository,
    },
  ],

  exports: [GenerateContextUseCase],
})
export class Ef01ContextModule {}
