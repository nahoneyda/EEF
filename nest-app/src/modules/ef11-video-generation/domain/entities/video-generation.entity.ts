export type VideoShotStatus = 'GENERATED' | 'FILTERED' | 'FAILED';

/** EF-09 스토리보드 + EF-10 이미지에서 조립한 클립 생성 대상 */
export interface VideoShotInput {
  sceneOrder: number;
  shotOrder: number;
  shotId: string;
  durationSec: number;
  visualDescription: string;
  cameraMovement: string;
  musicCue: string;
  /** EF-10 이미지 (image-to-video 입력) */
  imageArtifactId: string | null;
  imagePublicUrl: string | null;
  imageStorageBucket: string | null;
  imageStoragePath: string | null;
}

/** provider 가 반환하는 단일 영상 클립 */
export interface VideoProviderResult {
  provider: string;
  model: string;
  video: Buffer;
  mimeType: string;
  extension: string;
  durationSec: number;
  hasAudio: boolean;
  raiFilteredReason?: string;
  generationTimeSeconds: number;
}

export interface StoredVideoObject {
  bucket: string;
  path: string;
  publicUrl?: string;
  fileSizeBytes: number;
  mimeType: string;
  extension: string;
  checksumSha256: string;
}

export interface ShotVideoArtifact {
  shotId: string;
  sceneOrder: number;
  shotOrder: number;
  status: VideoShotStatus;
  artifactId?: string;
  storage?: StoredVideoObject;
  durationSec: number;
  promptText: string;
  raiFilteredReason?: string;
  errorMessage?: string;
}

export interface VideoSetManifest {
  schema_version: 'EF-11-V1';
  provider: string;
  model: string;
  aspect_ratio: string;
  total_shots: number;
  succeeded_shots: number;
  failed_shots: number;
  filtered_shots: number;
  total_duration_sec: number;
  clips: Array<{
    shot_id: string;
    scene_order: number;
    shot_order: number;
    status: VideoShotStatus;
    artifact_id: string | null;
    storage_bucket: string | null;
    storage_path: string | null;
    public_url: string | null;
    mime_type: string | null;
    size_bytes: number | null;
    checksum_sha256: string | null;
    duration_sec: number | null;
    rai_filtered_reason: string | null;
  }>;
}

export interface VideoGenerationResult {
  generationId: string;
  contentUuid: string;
  workflowRunId: string;
  moduleRunId: string;
  provider: string;
  model: string;
  totalShots: number;
  succeededShots: number;
  failedShots: number;
  filteredShots: number;
  artifacts: ShotVideoArtifact[];
}
