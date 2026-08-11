import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';
import { SupabaseService } from './common/supabase/supabase.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async health() {
    const supabase = await this.supabaseService.healthCheck();

    return {
      status: supabase ? 'ok' : 'degraded',

      service: 'EEF NestJS',

      runtime: 'nestjs',

      supabase: supabase ? 'connected' : 'disconnected',

      timestamp: new Date().toISOString(),
    };
  }
}
