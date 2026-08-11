import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ProviderPackageGeneratedEvent } from './events/provider-package-generated.event';

@Injectable()
export class ProviderPackageEventListener {
  private readonly logger = new Logger(ProviderPackageEventListener.name);

  @OnEvent('EF05.ProviderPackageGenerated')
  handle(event: ProviderPackageGeneratedEvent): void {
    this.logger.log(
      [
        'ProviderPackageGenerated received',
        `eventId=${event.eventId}`,
        `contentUuid=${event.contentUuid}`,
        `moduleRunId=${event.moduleRunId}`,
        `provider=${event.payload.provider}`,
        `model=${event.payload.providerModel ?? ''}`,
      ].join(' '),
    );
  }
}
