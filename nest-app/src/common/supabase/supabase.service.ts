import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);

  private readonly client: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');

    const serviceRoleKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is required');
    }

    if (!serviceRoleKey) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY environment variable is required',
      );
    }

    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    this.logger.log('Supabase client initialized');
  }

  get db(): SupabaseClient {
    return this.client;
  }

  async rpc<T = unknown>(
    functionName: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    const { data, error } = await this.client.rpc(functionName, params);

    if (error) {
      this.logger.error(`Supabase RPC failed: ${functionName}`, error.message);

      throw new InternalServerErrorException(
        `Supabase RPC failed: ${functionName}`,
      );
    }

    return data as T;
  }

  async select<T = unknown>(tableName: string, columns = '*'): Promise<T[]> {
    const { data, error } = await this.client.from(tableName).select(columns);

    if (error) {
      this.logger.error(`Supabase SELECT failed: ${tableName}`, error.message);

      throw new InternalServerErrorException(
        `Supabase SELECT failed: ${tableName}`,
      );
    }

    return (data ?? []) as T[];
  }

  async insert<T = unknown>(
    tableName: string,
    payload: Record<string, unknown>,
  ): Promise<T> {
    const { data, error } = await this.client
      .from(tableName)
      .insert(payload)
      .select()
      .single();

    if (error) {
      this.logger.error(`Supabase INSERT failed: ${tableName}`, error.message);

      throw new InternalServerErrorException(
        `Supabase INSERT failed: ${tableName}`,
      );
    }

    return data as T;
  }

  async update<T = unknown>(
    tableName: string,
    payload: Record<string, unknown>,
    match: Record<string, unknown>,
  ): Promise<T[]> {
    let query = this.client.from(tableName).update(payload);

    for (const [key, value] of Object.entries(match)) {
      query = query.eq(key, value);
    }

    const { data, error } = await query.select();

    if (error) {
      this.logger.error(`Supabase UPDATE failed: ${tableName}`, error.message);

      throw new InternalServerErrorException(
        `Supabase UPDATE failed: ${tableName}`,
      );
    }

    return (data ?? []) as T[];
  }

  async healthCheck(): Promise<boolean> {
    const { error } = await this.client
      .from('geef_workflow_runs')
      .select('id')
      .limit(1);

    if (error) {
      this.logger.error('Supabase health check failed', error.message);

      return false;
    }

    return true;
  }
}
