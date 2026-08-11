import { randomUUID } from 'crypto';

import { DomainEvent } from '../contracts/domain-event.interface';

export interface MusicSpecGeneratedPayload {
  status: 'READY';
  genre: string;
  bpm: number;
  musicalKey: string;
  targetDurationSec: number;
  modelName?: string;
}

export class MusicSpecGeneratedEvent
  implements DomainEvent<MusicSpecGeneratedPayload>
{
  readonly eventId = randomUUID();
  readonly eventName = 'EF03.MusicSpecGenerated';
  readonly occurredAt = new Date();
  readonly sourceModule = 'EF-03';

  constructor(
    readonly workflowRunId: string,
    readonly moduleRunId: string,
    readonly contentUuid: string,
    readonly payload: MusicSpecGeneratedPayload,
  ) {}
}
