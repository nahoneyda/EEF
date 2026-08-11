import { Injectable } from '@nestjs/common';

import { ModuleRunService } from '../../../../common/workflow/module-run/module-run.service';

import { EventBusService } from '../../../../common/events/event-bus.service';

import { ContextGeneratedEvent } from '../../../../common/events/events/context-generated.event';

import { ContextRepository } from '../../domain/repositories/context.repository';

import { ContextBuilderService } from '../../domain/services/context-builder.service';

import { ProjectContext } from '../../domain/entities/project-context.entity';

export interface GenerateContextRequest {
  workflowRunId: string;

  moduleRunId: string;

  contentUuid: string;

  source: Record<string, unknown>;
}

export interface GenerateContextResult {
  moduleCode: 'EF-01';

  status: 'SUCCEEDED';

  contentUuid: string;

  workflowRunId: string;

  moduleRunId: string;

  context: ProjectContext;

  saved: unknown;
}

@Injectable()
export class GenerateContextUseCase {
  constructor(
    private readonly builder: ContextBuilderService,

    private readonly repository: ContextRepository,

    private readonly moduleRunService: ModuleRunService,

    private readonly eventBus: EventBusService,
  ) {}

  /**
   * DB 및 workflow 상태를 변경하지 않고
   * EF-01 Context 결과만 생성합니다.
   */
  preview(source: Record<string, unknown>): ProjectContext {
    return this.builder.build(source);
  }

  /**
   * 실제 EF-01 실행
   */
  async execute(
    request: GenerateContextRequest,
  ): Promise<GenerateContextResult> {
    /**
     * Domain 객체는 module 실행 전에 먼저 생성합니다.
     *
     * Validation 자체가 실패한 경우에는
     * 아직 module_run을 RUNNING으로 만들지 않습니다.
     */
    const context = this.builder.build(request.source);

    /**
     * QUEUED → RUNNING
     */
    await this.moduleRunService.beginModule(request.moduleRunId);

    try {
      /**
       * Context 저장
       */
      const saved = await this.repository.save({
        contentUuid: request.contentUuid,

        workflowRunId: request.workflowRunId,

        moduleRunId: request.moduleRunId,

        context,
      });

      /**
       * RUNNING → SUCCEEDED
       */
      await this.moduleRunService.finishModule(
        request.moduleRunId,
        true,
        {
          module_code: 'EF-01',

          content_uuid: request.contentUuid,

          workflow_run_id: request.workflowRunId,

          module_run_id: request.moduleRunId,

          context_status: 'READY',
        },
        null,
        null,
      );

      /**
       * EF-01 성공 Event 발행
       *
       * 현재 Event Bus는 내부 이벤트 계층입니다.
       * 이후 Durable Outbox / Execution Queue와 연결합니다.
       */
      await this.eventBus.publish(
        new ContextGeneratedEvent(
          request.workflowRunId,
          request.moduleRunId,
          request.contentUuid,
          {
            contextStatus: context.contextStatus,

            genre: context.genre,

            theme: context.theme,

            tempoBpm: context.tempoBpm,

            musicalKey: context.musicalKey,

            targetDurationSeconds: context.targetDurationSeconds,
          },
        ),
      );

      return {
        moduleCode: 'EF-01',

        status: 'SUCCEEDED',

        contentUuid: request.contentUuid,

        workflowRunId: request.workflowRunId,

        moduleRunId: request.moduleRunId,

        context,

        saved,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      /**
       * beginModule() 이후 발생한 실패이므로
       * module_run을 FAILED로 종료합니다.
       */
      try {
        await this.moduleRunService.finishModule(
          request.moduleRunId,
          false,
          {
            module_code: 'EF-01',

            content_uuid: request.contentUuid,

            workflow_run_id: request.workflowRunId,

            module_run_id: request.moduleRunId,

            context_status: 'FAILED',
          },
          'EF01_EXECUTION_FAILED',
          errorMessage.substring(0, 2000),
        );
      } catch {
        /**
         * FAILED 기록 자체의 오류가
         * 실제 비즈니스 예외를 덮지 않도록 합니다.
         */
      }

      throw error;
    }
  }
}
