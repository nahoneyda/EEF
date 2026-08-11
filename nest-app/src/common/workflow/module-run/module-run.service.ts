import { Injectable, Logger } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class ModuleRunService {
  private readonly logger = new Logger(ModuleRunService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  private firstRow<T>(value: T | T[] | null): T | null {
    if (Array.isArray(value)) {
      return value.length > 0 ? value[0] : null;
    }

    return value;
  }

  async beginModule(moduleRunId: string): Promise<unknown> {
    const executionId =
      this.configService.get<string>('WORKER_ID') ?? 'geef-nest-worker';

    const rpcName =
      this.configService.get<string>('RPC_BEGIN_MODULE') ?? 'geef_begin_module';

    this.logger.log(`Beginning module: ${moduleRunId}`);

    const result = await this.supabaseService.rpc(rpcName, {
      p_module_run_id: moduleRunId,

      p_make_execution_id: executionId,
    });

    return this.firstRow(result);
  }

  async finishModule(
    moduleRunId: string,
    success: boolean,
    outputPayload: Record<string, unknown>,
    errorCode: string | null = null,
    errorMessage: string | null = null,
  ): Promise<unknown> {
    const rpcName =
      this.configService.get<string>('RPC_FINISH_MODULE') ??
      'geef_finish_module';

    this.logger.log(`Finishing module: ${moduleRunId} success=${success}`);

    const result = await this.supabaseService.rpc(rpcName, {
      p_module_run_id: moduleRunId,

      p_succeeded: success,

      p_output_payload: outputPayload,

      p_error_code: errorCode,

      p_error_message: errorMessage,
    });

    return this.firstRow(result);
  }
}
