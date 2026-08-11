export interface DomainEvent<TPayload = unknown> {
  eventId: string;

  eventName: string;

  occurredAt: Date;

  workflowRunId: string;

  moduleRunId: string;

  contentUuid: string;

  sourceModule: string;

  payload: TPayload;
}
