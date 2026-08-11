import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AudioGeneratedEvent } from './events/audio-generated.event';
@Injectable()
export class AudioGeneratedEventListener{
  private readonly logger=new Logger(AudioGeneratedEventListener.name);
  @OnEvent('EF06.AudioGenerated')
  handle(e:AudioGeneratedEvent):void{
    this.logger.log(`AudioGenerated received eventId=${e.eventId} contentUuid=${e.contentUuid} moduleRunId=${e.moduleRunId} generationId=${e.payload.generationId} storagePath=${e.payload.storagePath}`);
  }
}
