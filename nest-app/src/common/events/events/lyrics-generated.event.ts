import { randomUUID } from 'crypto';

import { DomainEvent } from '../contracts/domain-event.interface';

export interface LyricsGeneratedPayload {
  lyricsStatus: 'READY';
  titleKo: string;
  concept: string;
  hookLine: string;
  generationModel?: string;
}

export class LyricsGeneratedEvent
  implements DomainEvent<LyricsGeneratedPayload>
{
  readonly eventId = randomUUID();
  readonly eventName = 'EF02.LyricsGenerated';
  readonly occurredAt = new Date();
  readonly sourceModule = 'EF-02';

  constructor(
    readonly workflowRunId: string,
    readonly moduleRunId: string,
    readonly contentUuid: string,
    readonly payload: LyricsGeneratedPayload,
  ) {}
}
