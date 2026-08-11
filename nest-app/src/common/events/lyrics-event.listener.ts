import {
  Injectable,
  Logger,
} from '@nestjs/common';

import { OnEvent } from '@nestjs/event-emitter';

import { LyricsGeneratedEvent } from './events/lyrics-generated.event';

@Injectable()
export class LyricsEventListener {
  private readonly logger =
    new Logger(LyricsEventListener.name);

  @OnEvent('EF02.LyricsGenerated')
  handle(
    event: LyricsGeneratedEvent,
  ): void {
    this.logger.log(
      [
        'LyricsGenerated received',
        `eventId=${event.eventId}`,
        `contentUuid=${event.contentUuid}`,
        `moduleRunId=${event.moduleRunId}`,
        `titleKo=${event.payload.titleKo}`,
      ].join(' '),
    );
  }
}
