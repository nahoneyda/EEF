import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';

import { AppService } from './app.service';

import { SupabaseModule } from './common/supabase/supabase.module';

import { WorkflowModule } from './common/workflow/workflow.module';

import { Ef01ContextModule } from './modules/ef01-context/module/ef01-context.module';
import { WorkerModule } from './common/worker/worker.module';
import { EventsModule } from './common/events/events.module';
import { AiModule } from './common/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,

      envFilePath: '.env',
    }),

    SupabaseModule,

    WorkflowModule,

    Ef01ContextModule,
    WorkerModule,
    EventsModule,
    AiModule,
  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}
