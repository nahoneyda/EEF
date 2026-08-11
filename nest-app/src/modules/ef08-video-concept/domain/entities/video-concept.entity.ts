export interface VideoConcept {
  schema_version: 'EF-08-V1';
  title: string;
  logline: string;
  core_message: string;
  target_audience: string;
  visual_style: {
    genre: string;
    tone: string;
    color_palette: string[];
    lighting: string;
    camera_language: string;
    aspect_ratio: string;
  };
  narrative: {
    setting: string;
    protagonist: string;
    emotional_arc: string;
    opening: string;
    development: string;
    climax: string;
    ending: string;
  };
  music_sync: Array<{
    section: string;
    visual_intent: string;
    transition: string;
  }>;
  key_scenes: Array<{
    order: number;
    name: string;
    description: string;
    emotion: string;
    location: string;
    time_of_day: string;
  }>;
  production_constraints: {
    must_preserve: string[];
    avoid: string[];
    continuity_rules: string[];
  };
}

export function assertVideoConcept(value: Record<string, unknown>): asserts value is Record<string, unknown> & VideoConcept {
  const requiredStrings = ['title', 'logline', 'core_message', 'target_audience'];
  for (const key of requiredStrings) {
    if (typeof value[key] !== 'string' || !String(value[key]).trim()) {
      throw new Error(`EF-08 invalid concept: ${key} is required`);
    }
  }
  if (value.schema_version !== 'EF-08-V1') {
    throw new Error('EF-08 invalid concept: schema_version must be EF-08-V1');
  }
  if (!Array.isArray(value.key_scenes) || value.key_scenes.length < 3) {
    throw new Error('EF-08 invalid concept: at least 3 key_scenes are required');
  }
  if (!Array.isArray(value.music_sync) || value.music_sync.length < 1) {
    throw new Error('EF-08 invalid concept: music_sync is required');
  }
}
