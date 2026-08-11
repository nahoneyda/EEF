export type AudioJobType = 'CLIP' | 'PRO';
export type AudioJobStatus =
  | 'QUEUED' | 'PROCESSING' | 'GENERATED' | 'UPLOADING'
  | 'COMPLETED' | 'RETRY' | 'FAILED' | 'CANCELLED';
export type AudioRequestStatus =
  | 'PENDING' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'FAILED';
export type AudioGenerationStatus =
  | 'PENDING' | 'GENERATING' | 'GENERATED' | 'UPLOADING'
  | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface AudioProviderResult {
  provider: string;
  model: string;
  providerGenerationId?: string;
  audio: Buffer;
  mimeType: string;
  extension: string;
  outputText?: string;
  rawMetadata: Record<string, unknown>;
  generationTimeSeconds: number;
}
export interface StoredAudioObject {
  bucket: string;
  path: string;
  publicUrl?: string;
  fileSizeBytes: number;
  mimeType: string;
  extension: string;
}
export interface AudioGenerationResult {
  generationId: string;
  jobId: string;
  contentUuid: string;
  workflowRunId: string;
  moduleRunId: string;
  provider: string;
  providerModel: string;
  storage: StoredAudioObject;
  generationTimeSeconds: number;
}
