import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SupabaseService } from '../../../common/supabase/supabase.service';

import {
  ContextRepository,
  SaveContextInput,
  SavedContext,
} from '../domain/repositories/context.repository';

import { ProjectContext } from '../domain/entities/project-context.entity';

@Injectable()
export class SupabaseContextRepository implements ContextRepository {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  async save(input: SaveContextInput): Promise<SavedContext> {
    const rpcName =
      this.config.get<string>('RPC_SAVE_CONTEXT') ??
      'geef_save_project_context';

    const result = await this.supabase.rpc<unknown>(rpcName, {
      p_content_uuid: input.contentUuid,

      p_workflow_run_id: input.workflowRunId,

      p_module_run_id: input.moduleRunId,

      p_context: input.context.toPersistence(),
    });

    const raw = Array.isArray(result) ? (result[0] ?? null) : result;

    return {
      contentUuid: input.contentUuid,

      workflowRunId: input.workflowRunId,

      moduleRunId: input.moduleRunId,

      contextStatus: 'READY',

      raw,
    };
  }

  async findByContentUuid(
    _contentUuid: string,
  ): Promise<ProjectContext | null> {
    return null;
  }
}
