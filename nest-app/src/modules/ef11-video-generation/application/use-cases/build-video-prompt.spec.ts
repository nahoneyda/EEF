import { buildVideoPrompt } from './build-video-prompt';
import { VideoShotInput } from '../../domain/entities/video-generation.entity';

describe('build-video-prompt', () => {
  const shot: VideoShotInput = {
    sceneOrder: 1,
    shotOrder: 1,
    shotId: 'S01-C01',
    durationSec: 5,
    visualDescription: '창가에서 책을 펴는 중년 인물',
    cameraMovement: 'slow push-in',
    musicCue: 'intro',
    imageArtifactId: 'a1',
    imagePublicUrl: 'https://example.com/a.jpg',
    imageStorageBucket: 'geef-images',
    imageStoragePath: 'geef/x/S01-C01.jpg',
  };

  it('includes description and camera motion', () => {
    const p = buildVideoPrompt(shot);
    expect(p).toContain('창가에서 책을 펴는');
    expect(p).toContain('Camera motion: slow push-in');
    expect(p).toContain('no text overlay');
  });
});
