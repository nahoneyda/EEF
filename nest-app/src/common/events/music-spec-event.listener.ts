import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { MusicSpecGeneratedEvent } from './events/music-spec-generated.event';

@Injectable()
export class MusicSpecEventListener {
  private readonly logger =
    new Logger(MusicSpecEventListener.name);

  @OnEvent('EF03.MusicSpecGenerated')
  handle(
    event: MusicSpecGeneratedEvent,
  ): void {
    this.logger.log(
      [
        'MusicSpecGenerated received',
        `eventId=${event.eventId}`,
        `contentUuid=${event.contentUuid}`,
        `moduleRunId=${event.moduleRunId}`,
        `genre=${event.payload.genre}`,
        `bpm=${event.payload.bpm}`,
      ].join(' '),
    );
  }
}
