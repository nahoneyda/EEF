import { ProviderPackage } from '../entities/provider-package.entity';
import {
  Ef05CompositionPlanData,
  Ef05ContentMetadata,
  Ef05LyricsData,
  Ef05MusicSpecData,
} from '../repositories/provider-package.repository';

export interface BuildProviderPackageInput {
  workflowRunId: string;
  moduleRunId: string;
  metadata: Ef05ContentMetadata;
  lyrics: Ef05LyricsData;
  musicSpec: Ef05MusicSpecData;
  compositionPlan: Ef05CompositionPlanData;
  runMode: string;
}

export abstract class ProviderAdapter {
  abstract readonly provider: string;
  abstract build(input: BuildProviderPackageInput): ProviderPackage;
}
