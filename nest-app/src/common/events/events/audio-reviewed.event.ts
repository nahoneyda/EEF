import { randomUUID } from 'crypto';
import { DomainEvent } from '../contracts/domain-event.interface';

export interface AudioReviewedPayload {
  reviewId: string;
  reviewRound: 1;
  decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
  score: number;
  generationId: string;
}

export class AudioReviewedEvent implements DomainEvent<AudioReviewedPayload> {
  readonly eventId = randomUUID();
  readonly eventName = 'EF07.AudioReviewed';
  readonly occurredAt = new Date();
  readonly sourceModule = 'EF-07';

  constructor(
    readonly workflowRunId: string,
    readonly moduleRunId: string,
    readonly contentUuid: string,
    readonly payload: AudioReviewedPayload,
  ) {}
}
