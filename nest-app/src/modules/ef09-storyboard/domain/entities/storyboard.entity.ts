export interface StoryboardShot {
  shot_order: number;
  shot_id: string;
  duration_sec: number;
  shot_size: string;
  camera_angle: string;
  camera_movement: string;
  composition: string;
  subject_action: string;
  visual_description: string;
  lighting: string;
  color_mood: string;
  music_cue: string;
  transition_out: string;
}

export interface StoryboardScene {
  scene_order: number;
  scene_name: string;
  location: string;
  time_of_day: string;
  emotion: string;
  shots: StoryboardShot[];
}

export interface Storyboard {
  schema_version: 'EF-09-V1';
  title: string;
  aspect_ratio: string;
  total_duration_sec: number;
  global_style: {
    genre: string;
    tone: string;
    color_palette: string[];
    lighting: string;
    camera_language: string;
    continuity_rules: string[];
    avoid: string[];
  };
  scenes: StoryboardScene[];
}

export function assertStoryboard(
  value: Record<string, unknown>,
): asserts value is Record<string, unknown> & Storyboard {
  const requiredStrings = ['title', 'aspect_ratio'];
  for (const key of requiredStrings) {
    if (typeof value[key] !== 'string' || !String(value[key]).trim()) {
      throw new Error(`EF-09 invalid storyboard: ${key} is required`);
    }
  }

  if (value.schema_version !== 'EF-09-V1') {
    throw new Error(
      'EF-09 invalid storyboard: schema_version must be EF-09-V1',
    );
  }

  if (!Array.isArray(value.scenes) || value.scenes.length < 3) {
    throw new Error(
      'EF-09 invalid storyboard: at least 3 scenes are required',
    );
  }

  let totalShots = 0;

  for (const rawScene of value.scenes as unknown[]) {
    if (!rawScene || typeof rawScene !== 'object' || Array.isArray(rawScene)) {
      throw new Error('EF-09 invalid storyboard: scene must be an object');
    }

    const scene = rawScene as Record<string, unknown>;

    if (typeof scene.scene_order !== 'number') {
      throw new Error(
        'EF-09 invalid storyboard: scene.scene_order must be a number',
      );
    }

    if (!Array.isArray(scene.shots) || scene.shots.length < 1) {
      throw new Error(
        `EF-09 invalid storyboard: scene ${String(
          scene.scene_name ?? scene.scene_order,
        )} must contain at least 1 shot`,
      );
    }

    for (const rawShot of scene.shots as unknown[]) {
      if (!rawShot || typeof rawShot !== 'object' || Array.isArray(rawShot)) {
        throw new Error('EF-09 invalid storyboard: shot must be an object');
      }

      const shot = rawShot as Record<string, unknown>;

      if (
        typeof shot.visual_description !== 'string' ||
        !shot.visual_description.trim()
      ) {
        throw new Error(
          'EF-09 invalid storyboard: shot.visual_description is required (EF-10 image seed)',
        );
      }

      if (typeof shot.shot_id !== 'string' || !shot.shot_id.trim()) {
        throw new Error(
          'EF-09 invalid storyboard: shot.shot_id is required',
        );
      }

      totalShots += 1;
    }
  }

  if (totalShots < 3) {
    throw new Error(
      'EF-09 invalid storyboard: at least 3 shots in total are required',
    );
  }
}
