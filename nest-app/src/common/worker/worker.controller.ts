import { Body, Controller, Post } from '@nestjs/common';

import { WorkerService } from './worker.service';

import { RunNextModuleDto } from './dto/run-next-module.dto';

@Controller('api/internal/worker')
export class WorkerController {
  constructor(private readonly workerService: WorkerService) {}

  @Post('run-next')
  async runNext(
    @Body()
    dto: RunNextModuleDto,
  ) {
    return this.workerService.runNext(dto.workflowRunId);
  }
}
