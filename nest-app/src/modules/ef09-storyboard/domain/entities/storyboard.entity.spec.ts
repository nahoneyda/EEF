import { assertStoryboard } from './storyboard.entity';

describe('assertStoryboard', () => {
  const validShot = {
    shot_order: 1,
    shot_id: 'S01-C01',
    duration_sec: 5,
    shot_size: 'medium',
    camera_angle: 'eye-level',
    camera_movement: 'static',
    composition: 'centered',
    subject_action: '창가에서 책을 편다',
    visual_description: '오후 햇살이 드는 거실 창가에서 중년 인물이 오래된 책을 펼치는 모습',
    lighting: 'soft daylight',
    color_mood: 'warm beige',
    music_cue: 'intro',
    transition_out: 'dissolve',
  };

  const buildScene = (order: number) => ({
    scene_order: order,
    scene_name: `scene ${order}`,
    location: '거실',
    time_of_day: '오후',
    emotion: '차분함',
    shots: [{ ...validShot, shot_id: `S0${order}-C01` }],
  });

  it('accepts an EF-09-V1 storyboard', () => {
    const value: Record<string, unknown> = {
      schema_version: 'EF-09-V1',
      title: '햇살 한 스푼',
      aspect_ratio: '16:9',
      total_duration_sec: 210,
      global_style: {
        genre: 'cinematic',
        tone: 'warm',
        color_palette: ['웜 베이지'],
        lighting: 'soft',
        camera_language: 'gentle panning',
        continuity_rules: ['톤 유지'],
        avoid: ['과도한 효과'],
      },
      scenes: [buildScene(1), buildScene(2), buildScene(3)],
    };
    expect(() => assertStoryboard(value)).not.toThrow();
  });

  it('rejects a storyboard without enough scenes', () => {
    const value: Record<string, unknown> = {
      schema_version: 'EF-09-V1',
      title: '제목',
      aspect_ratio: '16:9',
      total_duration_sec: 210,
      global_style: {
        genre: 'cinematic',
        tone: 'warm',
        color_palette: ['웜 베이지'],
        lighting: 'soft',
        camera_language: 'gentle panning',
        continuity_rules: ['톤 유지'],
        avoid: ['과도한 효과'],
      },
      scenes: [buildScene(1)],
    };
    expect(() => assertStoryboard(value)).toThrow('at least 3 scenes');
  });

  it('rejects a shot without visual_description', () => {
    const brokenShot = { ...validShot, visual_description: '' };
    const value: Record<string, unknown> = {
      schema_version: 'EF-09-V1',
      title: '제목',
      aspect_ratio: '16:9',
      total_duration_sec: 210,
      global_style: {
        genre: 'cinematic',
        tone: 'warm',
        color_palette: ['웜 베이지'],
        lighting: 'soft',
        camera_language: 'gentle panning',
        continuity_rules: ['톤 유지'],
        avoid: ['과도한 효과'],
      },
      scenes: [
        buildScene(1),
        buildScene(2),
        {
          scene_order: 3,
          scene_name: 'scene 3',
          location: '거실',
          time_of_day: '오후',
          emotion: '차분함',
          shots: [brokenShot],
        },
      ],
    };
    expect(() => assertStoryboard(value)).toThrow('visual_description');
  });
});
