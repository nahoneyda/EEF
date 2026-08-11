import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../../../common/supabase/supabase.service';
import { AudioStorage, StoreAudioInput } from '../../domain/services/audio-storage.service';
import { StoredAudioObject } from '../../domain/entities/audio-generation.entity';

@Injectable()
export class SupabaseAudioStorageService extends AudioStorage {
  constructor(private readonly supabase: SupabaseService, private readonly config: ConfigService) { super(); }

  async store(input: StoreAudioInput): Promise<StoredAudioObject> {
    const bucket = this.config.get<string>('EF06_AUDIO_BUCKET') ?? 'ai-music';
    const prefix = this.config.get<string>('EF06_STORAGE_PREFIX') ?? 'geef';
    const project = input.projectCode.replace(/[^a-zA-Z0-9_-]+/g, '_');
    const path = `${prefix}/${project}/${input.contentUuid}/ef06/${input.moduleRunId}.${input.extension}`;

    const { error } = await this.supabase.db.storage.from(bucket).upload(path, input.audio, {
      contentType: input.mimeType,
      upsert: true,
    });
    if (error) throw new Error(`Supabase audio upload failed: ${error.message}`);

    const { data } = this.supabase.db.storage.from(bucket).getPublicUrl(path);
    return {
      bucket, path,
      publicUrl: data?.publicUrl || undefined,
      fileSizeBytes: input.audio.length,
      mimeType: input.mimeType,
      extension: input.extension,
    };
  }
}
