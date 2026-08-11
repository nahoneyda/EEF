import { Inject, Injectable, OnModuleInit } from '@nestjs/common';

import { ModuleExecutor } from './module-executor.interface';

export const EF01_EXECUTOR = Symbol('EF01_EXECUTOR');
export const EF02_EXECUTOR = Symbol('EF02_EXECUTOR');
export const EF03_EXECUTOR = Symbol('EF03_EXECUTOR');
export const EF04_EXECUTOR = Symbol('EF04_EXECUTOR');
export const EF05_EXECUTOR = Symbol('EF05_EXECUTOR');
export const EF06_EXECUTOR = Symbol('EF06_EXECUTOR');
export const EF07_EXECUTOR = Symbol('EF07_EXECUTOR');
export const EF08_EXECUTOR = Symbol('EF08_EXECUTOR');
export const EF09_EXECUTOR = Symbol('EF09_EXECUTOR');
export const EF10_EXECUTOR = Symbol('EF10_EXECUTOR');

@Injectable()
export class ExecutorRegistry implements OnModuleInit {
  private readonly executors = new Map<string, ModuleExecutor>();

  constructor(
    @Inject(EF01_EXECUTOR)
    private readonly ef01Executor: ModuleExecutor,

    @Inject(EF02_EXECUTOR)
    private readonly ef02Executor: ModuleExecutor,

    @Inject(EF03_EXECUTOR)
    private readonly ef03Executor: ModuleExecutor,

    @Inject(EF04_EXECUTOR)
    private readonly ef04Executor: ModuleExecutor,

    @Inject(EF05_EXECUTOR)
    private readonly ef05Executor: ModuleExecutor,

    @Inject(EF06_EXECUTOR)
    private readonly ef06Executor: ModuleExecutor,

    @Inject(EF07_EXECUTOR)
    private readonly ef07Executor: ModuleExecutor,

    @Inject(EF08_EXECUTOR)
    private readonly ef08Executor: ModuleExecutor,

    @Inject(EF09_EXECUTOR)
    private readonly ef09Executor: ModuleExecutor,

    @Inject(EF10_EXECUTOR)
    private readonly ef10Executor: ModuleExecutor,
  ) {}

  onModuleInit(): void {
    [
      this.ef01Executor,
      this.ef02Executor,
      this.ef03Executor,
      this.ef04Executor,
      this.ef05Executor,
      this.ef06Executor,
      this.ef07Executor,
      this.ef08Executor,
      this.ef09Executor,
      this.ef10Executor,
    ].forEach((executor) => this.register(executor));
  }

  register(executor: ModuleExecutor): void {
    if (this.executors.has(executor.moduleCode)) {
      throw new Error(
        `Duplicate executor registration: ${executor.moduleCode}`,
      );
    }

    this.executors.set(executor.moduleCode, executor);
  }

  get(moduleCode: string): ModuleExecutor {
    const executor = this.executors.get(moduleCode);

    if (!executor) {
      throw new Error(`Executor not found: ${moduleCode}`);
    }

    return executor;
  }

  has(moduleCode: string): boolean {
    return this.executors.has(moduleCode);
  }
}
