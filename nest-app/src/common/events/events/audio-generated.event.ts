import { randomUUID } from 'crypto';
import { DomainEvent } from '../contracts/domain-event.interface';
export interface AudioGeneratedPayload {
  status:'COMPLETED'; provider:string; providerModel:string; generationId:string; jobId:string;
  storageBucket:string; storagePath:string; audioPublicUrl?:string; fileSizeBytes:number;
}
export class AudioGeneratedEvent implements DomainEvent<AudioGeneratedPayload>{
  readonly eventId=randomUUID(); readonly eventName='EF06.AudioGenerated';
  readonly occurredAt=new Date(); readonly sourceModule='EF-06';
  constructor(readonly workflowRunId:string,readonly moduleRunId:string,readonly contentUuid:string,readonly payload:AudioGeneratedPayload){}
}
