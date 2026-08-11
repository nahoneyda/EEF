import { randomUUID } from 'crypto';

import { DomainEvent } from '../contracts/domain-event.interface';

export interface CompositionPlanGeneratedPayload {
  status: 'READY';
  titleKo: string;
  bpm: number;
  musicalKey: string;
  targetDurationSec: number;
  generationModel?: string;
}

export class CompositionPlanGeneratedEvent
  implements DomainEvent<CompositionPlanGeneratedPayload>
{
  readonly eventId = randomUUID();
  readonly eventName = 'EF04.CompositionPlanGenerated';
  readonly occurredAt = new Date();
  readonly sourceModule = 'EF-04';

  constructor(
    readonly workflowRunId: string,
    readonly moduleRunId: string,
    readonly contentUuid: string,
    readonly payload: CompositionPlanGeneratedPayload,
  ) {}
}
