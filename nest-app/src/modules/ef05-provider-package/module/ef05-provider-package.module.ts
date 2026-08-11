import { Module } from '@nestjs/common';
import { WorkflowModule } from '../../../common/workflow/workflow.module';
import { ProviderPackageRepository } from '../domain/repositories/provider-package.repository';
import { ProviderAdapter } from '../domain/services/provider-adapter.service';
import { SupabaseProviderPackageRepository } from '../infrastructure/supabase-provider-package.repository';
import { GoogleLyriaProviderAdapter } from '../infrastructure/adapters/google-lyria-provider.adapter';
import { GenerateProviderPackageUseCase } from '../application/use-cases/generate-provider-package.use-case';

@Module({
  imports: [WorkflowModule],
  providers: [
    GenerateProviderPackageUseCase,
    {
      provide: ProviderPackageRepository,
      useClass: SupabaseProviderPackageRepository,
    },
    {
      provide: ProviderAdapter,
      useClass: GoogleLyriaProviderAdapter,
    },
  ],
  exports: [GenerateProviderPackageUseCase],
})
export class Ef05ProviderPackageModule {}
