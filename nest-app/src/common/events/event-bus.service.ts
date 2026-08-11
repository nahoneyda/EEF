import { Injectable, Logger } from '@nestjs/common';

import { EventEmitter2 } from '@nestjs/event-emitter';

import { DomainEvent } from './contracts/domain-event.interface';

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async publish<TPayload>(event: DomainEvent<TPayload>): Promise<void> {
    this.logger.log(
      [
        'Publishing event',
        `name=${event.eventName}`,
        `eventId=${event.eventId}`,
        `moduleRunId=${event.moduleRunId}`,
      ].join(' '),
    );

    await this.eventEmitter.emitAsync(event.eventName, event);
  }
}
