import { Injectable, Logger } from '@nestjs/common';

import { OnEvent } from '@nestjs/event-emitter';

import { ContextGeneratedEvent } from './events/context-generated.event';

@Injectable()
export class ContextEventListener {
  private readonly logger = new Logger(ContextEventListener.name);

  @OnEvent('EF01.ContextGenerated')
  handle(event: ContextGeneratedEvent): void {
    this.logger.log(
      [
        'ContextGenerated received',
        `eventId=${event.eventId}`,
        `contentUuid=${event.contentUuid}`,
        `moduleRunId=${event.moduleRunId}`,
      ].join(' '),
    );
  }
}
