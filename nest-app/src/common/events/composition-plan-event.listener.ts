import {
  Injectable,
  Logger,
} from '@nestjs/common';

import { OnEvent } from '@nestjs/event-emitter';

import { CompositionPlanGeneratedEvent } from './events/composition-plan-generated.event';

@Injectable()
export class CompositionPlanEventListener {
  private readonly logger =
    new Logger(CompositionPlanEventListener.name);

  @OnEvent('EF04.CompositionPlanGenerated')
  handle(
    event: CompositionPlanGeneratedEvent,
  ): void {
    this.logger.log(
      [
        'CompositionPlanGenerated received',
        `eventId=${event.eventId}`,
        `contentUuid=${event.contentUuid}`,
        `moduleRunId=${event.moduleRunId}`,
        `titleKo=${event.payload.titleKo}`,
      ].join(' '),
    );
  }
}
