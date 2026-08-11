import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { SupabaseService } from '../../../../common/supabase/supabase.service';
import {
  ImageStorage,
  StoreImageInput,
} from '../../domain/services/image-services';
import { StoredImageObject } from '../../domain/entities/image-generation.entity';

@Injectable()
export class SupabaseImageStorageService extends ImageStorage {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async store(input: StoreImageInput): Promise<StoredImageObject> {
    const bucket = this.config.get<string>('EF10_IMAGE_BUCKET') ?? 'ai-image';
    const prefix = this.config.get<string>('EF10_STORAGE_PREFIX') ?? 'geef';
    const project = input.projectCode.replace(/[^a-zA-Z0-9_-]+/g, '_');
    const safeShot = input.shotId.replace(/[^a-zA-Z0-9_-]+/g, '_');
    const path = `${prefix}/${project}/${input.contentUuid}/ef10/${input.moduleRunId}/${safeShot}.${input.extension}`;

    const { error } = await this.supabase.db.storage
      .from(bucket)
      .upload(path, input.image, {
        contentType: input.mimeType,
        upsert: true,
      });
    if (error) {
      throw new Error(`Supabase image upload failed: ${error.message}`);
    }

    const { data } = this.supabase.db.storage.from(bucket).getPublicUrl(path);
    const checksumSha256 = createHash('sha256')
      .update(input.image)
      .digest('hex');

    return {
      bucket,
      path,
      publicUrl: data?.publicUrl || undefined,
      fileSizeBytes: input.image.length,
      mimeType: input.mimeType,
      extension: input.extension,
      checksumSha256,
    };
  }
}
