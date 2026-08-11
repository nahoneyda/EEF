import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AudioReviewedEvent } from './events/audio-reviewed.event';

@Injectable()
export class AudioReviewedEventListener {
  private readonly logger = new Logger(AudioReviewedEventListener.name);

  @OnEvent('EF07.AudioReviewed')
  handle(event: AudioReviewedEvent): void {
    this.logger.log(
      `AudioReviewed received eventId=${event.eventId} contentUuid=${event.contentUuid} ` +
        `decision=${event.payload.decision} score=${event.payload.score}`,
    );
  }
}
