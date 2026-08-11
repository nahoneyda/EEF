export type ReviewDecision =
  | 'PENDING'
  | 'APPROVED'
  | 'CHANGES_REQUESTED'
  | 'REJECTED';

export interface AudioGenerationSource {
  id: string;
  contentUuid: string;
  workflowRunId?: string;
  moduleRunId?: string;
  storageBucket: string;
  storagePath: string;
  publicUrl?: string;
  format?: string;
  mimeType?: string;
  durationSeconds?: number;
  sampleRate?: number;
  bitDepth?: number;
  channels?: number;
  fileSizeBytes?: number;
  requestPayload: Record<string, unknown>;
  createdAt: string;
}

export interface AudioTechnicalAnalysis {
  formatName: string;
  codecName: string;
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  bitRate: number | null;
  sampleFormat: string | null;
  bitDepth: number | null;
  fileSizeBytes: number;
  maxVolumeDb: number | null;
  integratedLufs: number | null;
  silenceDurationSeconds: number;
  silenceRatio: number;
  clippingRisk: boolean;
}

export interface QcIssue {
  code: string;
  severity: 'WARNING' | 'ERROR' | 'FATAL';
  message: string;
  deduction: number;
}

export interface AudioQcResult {
  decision: Exclude<ReviewDecision, 'PENDING'>;
  score: number;
  issues: QcIssue[];
  checks: Record<string, unknown>;
}

export interface SavedReview {
  id: string;
  contentUuid: string;
  reviewRound: number;
  decision: ReviewDecision;
  score: number | null;
}
