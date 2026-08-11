import { randomUUID } from 'crypto';
import { DomainEvent } from '../contracts/domain-event.interface';

export interface ProviderPackageGeneratedPayload {
  status: 'READY';
  provider: string;
  providerModel?: string;
  titleKo: string;
  packageVersion: string;
  outputAudioFormat: string;
}

export class ProviderPackageGeneratedEvent
  implements DomainEvent<ProviderPackageGeneratedPayload>
{
  readonly eventId = randomUUID();
  readonly eventName = 'EF05.ProviderPackageGenerated';
  readonly occurredAt = new Date();
  readonly sourceModule = 'EF-05';

  constructor(
    readonly workflowRunId: string,
    readonly moduleRunId: string,
    readonly contentUuid: string,
    readonly payload: ProviderPackageGeneratedPayload,
  ) {}
}
