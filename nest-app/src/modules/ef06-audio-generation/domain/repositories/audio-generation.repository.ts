import {
  AudioGenerationStatus, AudioJobStatus, AudioJobType,
  AudioProviderResult, AudioRequestStatus, StoredAudioObject,
} from '../entities/audio-generation.entity';

export interface Ef06ProviderPackage {
  id: string;
  projectId: string;
  projectCode: string;
  contentUuid: string;
  packageVersion: string;
  providerPrompt: string;
  outputAudioFormat: string;
  generationParameters: Record<string, unknown>;
  packageStatus: 'READY';
}
export interface CreateAudioJobInput {
  projectId: string; projectCode: string; contentUuid: string;
  workflowRunId: string; moduleRunId: string; compositionPackageId: string;
  jobType: AudioJobType; provider: string; providerModel: string;
  inputPrompt: string; requestPayload: Record<string, unknown>;
  maxAttempts: number; storageBucket: string;
}
export interface CreateGenerationInput {
  projectId: string; projectCode: string; contentUuid: string;
  workflowRunId: string; moduleRunId: string; compositionPackageId: string;
  provider: string; providerModel: string; requestPayload: Record<string, unknown>;
}
export abstract class AudioGenerationRepository {
  abstract getProviderPackage(contentUuid: string): Promise<Ef06ProviderPackage>;
  abstract createJob(input: CreateAudioJobInput): Promise<{ jobId: string }>;
  abstract createGeneration(input: CreateGenerationInput): Promise<{ id: string }>;
  abstract updateJobStatus(jobId: string, status: AudioJobStatus, patch?: Record<string, unknown>): Promise<void>;
  abstract updateGenerationStatus(id: string, request: AudioRequestStatus, status: AudioGenerationStatus, patch?: Record<string, unknown>): Promise<void>;
  abstract completeJob(jobId: string, storage: StoredAudioObject, providerInteractionId?: string): Promise<void>;
  abstract completeGeneration(id: string, result: AudioProviderResult, storage: StoredAudioObject): Promise<void>;
  abstract failJob(jobId: string, code: string, message: string): Promise<void>;
  abstract failGeneration(id: string, code: string, message: string): Promise<void>;
}
