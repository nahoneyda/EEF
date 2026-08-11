import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventBusService } from './event-bus.service';
import { ContextEventListener } from './context-event.listener';
import { LyricsEventListener } from './lyrics-event.listener';
import { MusicSpecEventListener } from './music-spec-event.listener';
import { CompositionPlanEventListener } from './composition-plan-event.listener';
import { ProviderPackageEventListener } from './provider-package-event.listener';
import { AudioGeneratedEventListener } from './audio-generated-event.listener';
@Global()
@Module({
  imports:[EventEmitterModule.forRoot({wildcard:false,delimiter:'.',newListener:false,removeListener:false,maxListeners:20,verboseMemoryLeak:true,ignoreErrors:false})],
  providers:[EventBusService,ContextEventListener,LyricsEventListener,MusicSpecEventListener,CompositionPlanEventListener,ProviderPackageEventListener,AudioGeneratedEventListener],
  exports:[EventBusService],
})
export class EventsModule{}
