import { ProviderPackage } from '../entities/provider-package.entity';

export interface Ef05ContentMetadata {
  contentUuid: string;
  contentId: string;
  projectId: string;
  projectCode: string;
}

export interface Ef05LyricsData {
  titleKo: string;
  titleEn: string;
  concept: string;
  hookLine: string;
  lyrics: Record<string, string>;
  lyricKeywords: string[];
  language: string;
}

export interface Ef05MusicSpecData {
  genre: string;
  subgenre?: string;
  bpm: number;
  musicalKey: string;
  timeSignature: string;
  targetDurationSec: number;
  mood: string[];
  instrumentation: Record<string, unknown>;
  vocalSpec: Record<string, unknown>;
  arrangement: Record<string, unknown>;
  productionStyle: Record<string, unknown>;
  generationConstraints: Record<string, unknown>;
}

export interface Ef05CompositionPlanData {
  planVersion: string;
  titleKo: string;
  titleEn: string;
  language: string;
  targetDurationSec: number;
  bpm: number;
  musicalKey: string;
  timeSignature: string;
  songStructure: unknown[];
  sectionTiming: Record<string, unknown>;
  harmonyPlan: Record<string, unknown>;
  melodyPlan: Record<string, unknown>;
  rhythmPlan: Record<string, unknown>;
  vocalPhrasingPlan: Record<string, unknown>;
  instrumentationCues: unknown[];
  dynamicsPlan: Record<string, unknown>;
  transitionPlan: unknown[];
  hookStrategy: Record<string, unknown>;
  generationConstraints: Record<string, unknown>;
}

export interface SavedProviderPackage {
  id?: string;
  contentUuid?: string;
  status?: string;
  raw?: unknown;
}

export abstract class ProviderPackageRepository {
  abstract getContentMetadata(contentUuid: string): Promise<Ef05ContentMetadata>;
  abstract getLyrics(contentUuid: string): Promise<Ef05LyricsData>;
  abstract getMusicSpec(contentUuid: string): Promise<Ef05MusicSpecData>;
  abstract getCompositionPlan(contentUuid: string): Promise<Ef05CompositionPlanData>;
  abstract save(providerPackage: ProviderPackage): Promise<SavedProviderPackage>;
}
