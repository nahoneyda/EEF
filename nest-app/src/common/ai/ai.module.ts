import {
  Global,
  Module,
} from '@nestjs/common';

import { GoogleAiService } from './google-ai.service';
import { ModelRegistryService } from './model-registry.service';

@Global()
@Module({
  providers: [
    GoogleAiService,
    ModelRegistryService,
  ],
  exports: [
    GoogleAiService,
    ModelRegistryService,
  ],
})
export class AiModule {}
