import { Injectable, Logger } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { SupabaseService } from '../supabase/supabase.service';

export interface QueuedModuleJob {
  moduleCode: string;

  contentUuid: string;

  workflowRunId: string;

  moduleRunId: string;

  contentId?: string;

  runMode?: string;

  inputPayload: Record<string, unknown>;

  raw: Record<string, unknown>;
}

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly supabaseService: SupabaseService,

    private readonly configService: ConfigService,
  ) {}

  async getNextQueuedModule(
    workflowRunId: string,
  ): Promise<QueuedModuleJob | null> {
    const rpcName =
      this.configService.get<string>('RPC_GET_NEXT_MODULE') ??
      'geef_get_next_queued_module';

    const result = await this.supabaseService.rpc<unknown>(rpcName, {
      p_workflow_run_id: workflowRunId,
    });

    const row = this.firstRow(result);

    if (!row) {
      this.logger.log(`No queued module: workflowRunId=${workflowRunId}`);

      return null;
    }

    if (typeof row !== 'object' || Array.isArray(row)) {
      throw new Error('Invalid queued module response');
    }

    const raw = row as Record<string, unknown>;

    const moduleCode = this.requiredString(raw.module_code, 'module_code');

    const contentUuid = this.requiredString(raw.content_uuid, 'content_uuid');

    const moduleRunId = this.requiredString(
      raw.module_run_id ?? raw.id,
      'module_run_id',
    );

    const returnedWorkflowRunId =
      this.optionalString(raw.workflow_run_id) ?? workflowRunId;

    const inputPayload = this.objectValue(raw.input_payload);

    return {
      moduleCode,

      contentUuid,

      workflowRunId: returnedWorkflowRunId,

      moduleRunId,

      contentId: this.optionalString(raw.content_id),

      runMode: this.optionalString(raw.run_mode),

      inputPayload,

      raw,
    };
  }

  private firstRow(value: unknown): unknown | null {
    if (Array.isArray(value)) {
      return value.length > 0 ? value[0] : null;
    }

    return value ?? null;
  }

  private requiredString(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`Queued module is missing ${fieldName}`);
    }

    return value.trim();
  }

  private optionalString(value: unknown): string | undefined {
    if (typeof value !== 'string' || !value.trim()) {
      return undefined;
    }

    return value.trim();
  }

  private objectValue(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return {};
  }
}
