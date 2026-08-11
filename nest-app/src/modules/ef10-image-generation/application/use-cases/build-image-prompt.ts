import { Ef10StoryboardSource } from '../../domain/repositories/image-generation.repository';
import { StoryboardShotInput } from '../../domain/entities/image-generation.entity';

/**
 * shot 1개 + storyboard global_style 을 Imagen 텍스트 프롬프트로 합성한다.
 * EF-09 가 채운 visual_description 을 중심으로, 촬영/스타일 힌트를 덧붙인다.
 */
export function buildImagePrompt(
  source: Ef10StoryboardSource,
  shot: StoryboardShotInput,
): string {
  const style = source.globalStyle;
  const palette = Array.isArray(style.color_palette)
    ? (style.color_palette as unknown[]).map((x) => String(x)).join(', ')
    : '';

  const parts: string[] = [];

  parts.push(shot.visualDescription);

  const cameraBits = [shot.shotSize, shot.cameraAngle, shot.composition]
    .filter((v) => v && v.trim())
    .join(', ');
  if (cameraBits) parts.push(`Camera: ${cameraBits}.`);

  const lightBits = [shot.lighting, shot.colorMood].filter((v) => v && v.trim());
  if (lightBits.length) parts.push(`Lighting/Mood: ${lightBits.join(', ')}.`);

  if (typeof style.tone === 'string' && style.tone.trim()) {
    parts.push(`Overall tone: ${style.tone}.`);
  }
  if (typeof style.genre === 'string' && style.genre.trim()) {
    parts.push(`Style: ${style.genre}.`);
  }
  if (palette) parts.push(`Color palette: ${palette}.`);

  parts.push('Photorealistic, cinematic, high detail, no text, no watermark.');

  return parts.filter((p) => p && p.trim()).join(' ');
}

/**
 * global_style.avoid 를 negativePrompt 로 변환.
 */
export function buildNegativePrompt(source: Ef10StoryboardSource): string {
  const style = source.globalStyle;
  const avoid = Array.isArray(style.avoid)
    ? (style.avoid as unknown[]).map((x) => String(x))
    : [];
  const base = ['text', 'watermark', 'logo', 'distorted anatomy', 'low quality'];
  return [...avoid, ...base].filter((v) => v && v.trim()).join(', ');
}
