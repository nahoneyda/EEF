import { Module } from '@nestjs/common';

import { WorkflowService } from './workflow.service';

import { ModuleRunService } from './module-run/module-run.service';

@Module({
  providers: [WorkflowService, ModuleRunService],

  exports: [WorkflowService, ModuleRunService],
})
export class WorkflowModule {}
