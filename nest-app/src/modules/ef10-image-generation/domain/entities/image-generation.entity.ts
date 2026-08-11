export type ImageShotStatus = 'GENERATED' | 'FILTERED' | 'FAILED';

/** EF-09 스토리보드에서 추출한, 이미지 생성 대상 shot 1개 */
export interface StoryboardShotInput {
  sceneOrder: number;
  sceneName: string;
  shotOrder: number;
  shotId: string;
  visualDescription: string;
  shotSize: string;
  cameraAngle: string;
  cameraMovement: string;
  composition: string;
  lighting: string;
  colorMood: string;
}

/** Imagen provider 가 반환하는 단일 이미지 결과 */
export interface ImageProviderResult {
  provider: string;
  model: string;
  image: Buffer;
  mimeType: string;
  extension: string;
  raiFilteredReason?: string;
  enhancedPrompt?: string;
  generationTimeSeconds: number;
}

/** Supabase Storage 에 업로드된 이미지 객체 */
export interface StoredImageObject {
  bucket: string;
  path: string;
  publicUrl?: string;
  fileSizeBytes: number;
  mimeType: string;
  extension: string;
  checksumSha256: string;
}

/** shot 1개에 대한 최종 이미지 산출물 (artifact 저장 결과 포함) */
export interface ShotImageArtifact {
  shotId: string;
  sceneOrder: number;
  shotOrder: number;
  status: ImageShotStatus;
  artifactId?: string;
  storage?: StoredImageObject;
  promptText: string;
  raiFilteredReason?: string;
  errorMessage?: string;
}

/** geef_generation_versions 에 저장할 IMAGE_SET 매니페스트 */
export interface ImageSetManifest {
  schema_version: 'EF-10-V1';
  provider: string;
  model: string;
  aspect_ratio: string;
  total_shots: number;
  succeeded_shots: number;
  failed_shots: number;
  filtered_shots: number;
  images: Array<{
    shot_id: string;
    scene_order: number;
    shot_order: number;
    status: ImageShotStatus;
    artifact_id: string | null;
    storage_bucket: string | null;
    storage_path: string | null;
    public_url: string | null;
    mime_type: string | null;
    size_bytes: number | null;
    checksum_sha256: string | null;
    rai_filtered_reason: string | null;
  }>;
}

export interface ImageGenerationResult {
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
  artifacts: ShotImageArtifact[];
}
