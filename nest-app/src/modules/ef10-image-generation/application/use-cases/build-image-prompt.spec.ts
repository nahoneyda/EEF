import { buildImagePrompt, buildNegativePrompt } from './build-image-prompt';
import { Ef10StoryboardSource } from '../../domain/repositories/image-generation.repository';
import { StoryboardShotInput } from '../../domain/entities/image-generation.entity';

describe('build-image-prompt', () => {
  const source: Ef10StoryboardSource = {
    contentUuid: 'c-uuid',
    projectId: 'p-uuid',
    projectCode: 'GEEF_ENTERTAINMENT_FACTORY',
    storyboardGenerationId: 'sb-uuid',
    title: '햇살 한 스푼',
    aspectRatio: '16:9',
    globalStyle: {
      genre: 'cinematic',
      tone: 'warm',
      color_palette: ['웜 베이지', '소프트 오렌지'],
      avoid: ['과도한 효과'],
    },
    shots: [],
  };

  const shot: StoryboardShotInput = {
    sceneOrder: 1,
    sceneName: '창가의 회상',
    shotOrder: 1,
    shotId: 'S01-C01',
    visualDescription: '오후 햇살이 드는 거실 창가에서 책을 펼치는 중년 인물',
    shotSize: 'medium',
    cameraAngle: 'eye-level',
    cameraMovement: 'static',
    composition: 'centered',
    lighting: 'soft daylight',
    colorMood: 'warm beige',
  };

  it('includes the visual description and style hints', () => {
    const prompt = buildImagePrompt(source, shot);
    expect(prompt).toContain('오후 햇살');
    expect(prompt).toContain('Camera:');
    expect(prompt).toContain('웜 베이지');
    expect(prompt).toContain('no text');
  });

  it('builds a negative prompt from avoid + defaults', () => {
    const neg = buildNegativePrompt(source);
    expect(neg).toContain('과도한 효과');
    expect(neg).toContain('watermark');
  });
});
