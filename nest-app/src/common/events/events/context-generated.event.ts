import { randomUUID } from 'crypto';

import { DomainEvent } from '../contracts/domain-event.interface';

export interface ContextGeneratedPayload {
  contextStatus: 'READY';

  genre: string;

  theme: string;

  tempoBpm: number;

  musicalKey: string;

  targetDurationSeconds: number;
}

export class ContextGeneratedEvent implements DomainEvent<ContextGeneratedPayload> {
  readonly eventId = randomUUID();

  readonly eventName = 'EF01.ContextGenerated';

  readonly occurredAt = new Date();

  readonly sourceModule = 'EF-01';

  constructor(
    readonly workflowRunId: string,

    readonly moduleRunId: string,

    readonly contentUuid: string,

    readonly payload: ContextGeneratedPayload,
  ) {}
}
