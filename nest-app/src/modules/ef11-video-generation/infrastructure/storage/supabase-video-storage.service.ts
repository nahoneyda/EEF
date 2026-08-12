import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { SupabaseService } from '../../../../common/supabase/supabase.service';
import {
  StoreVideoInput,
  VideoStorage,
} from '../../domain/services/video-services';
import { StoredVideoObject } from '../../domain/entities/video-generation.entity';

@Injectable()
export class SupabaseVideoStorageService extends VideoStorage {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async store(input: StoreVideoInput): Promise<StoredVideoObject> {
    const bucket = this.config.get<string>('EF11_VIDEO_BUCKET') ?? 'geef-videos';
    const prefix = this.config.get<string>('EF11_STORAGE_PREFIX') ?? 'geef';
    const project = input.projectCode.replace(/[^a-zA-Z0-9_-]+/g, '_');
    const safeShot = input.shotId.replace(/[^a-zA-Z0-9_-]+/g, '_');
    const path = `${prefix}/${project}/${input.contentUuid}/ef11/${input.moduleRunId}/${safeShot}.${input.extension}`;

    const { error } = await this.supabase.db.storage
      .from(bucket)
      .upload(path, input.video, {
        contentType: input.mimeType,
        upsert: true,
      });
    if (error) {
      throw new Error(`Supabase video upload failed: ${error.message}`);
    }

    const { data } = this.supabase.db.storage.from(bucket).getPublicUrl(path);
    const checksumSha256 = createHash('sha256')
      .update(input.video)
      .digest('hex');

    return {
      bucket,
      path,
      publicUrl: data?.publicUrl || undefined,
      fileSizeBytes: input.video.length,
      mimeType: input.mimeType,
      extension: input.extension,
      checksumSha256,
    };
  }
}
