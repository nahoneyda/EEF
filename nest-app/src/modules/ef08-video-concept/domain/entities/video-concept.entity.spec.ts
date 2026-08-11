import { assertVideoConcept } from './video-concept.entity';

describe('assertVideoConcept', () => {
  it('accepts an EF-08-V1 concept', () => {
    const value: Record<string, unknown> = {
      schema_version: 'EF-08-V1',
      title: '다시 피어나는 길',
      logline: '익숙한 길에서 다시 희망을 발견한다.',
      core_message: '삶은 다시 시작될 수 있다.',
      target_audience: '한국의 중장년층',
      music_sync: [{ section: 'intro', visual_intent: '새벽길', transition: 'fade' }],
      key_scenes: [{}, {}, {}],
    };
    expect(() => assertVideoConcept(value)).not.toThrow();
  });

  it('rejects a concept without enough key scenes', () => {
    const value: Record<string, unknown> = {
      schema_version: 'EF-08-V1',
      title: '제목',
      logline: '로그라인',
      core_message: '메시지',
      target_audience: '대상',
      music_sync: [{}],
      key_scenes: [],
    };
    expect(() => assertVideoConcept(value)).toThrow('at least 3 key_scenes');
  });
});
