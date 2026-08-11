import { ProjectContext } from '../entities/project-context.entity';

export interface SaveContextInput {
  contentUuid: string;
  workflowRunId: string;
  moduleRunId: string;
  context: ProjectContext;
}

export interface SavedContext {
  id?: string;

  contentUuid?: string;

  workflowRunId?: string;

  moduleRunId?: string;

  contextStatus?: string;

  raw?: unknown;
}

export abstract class ContextRepository {
  abstract save(input: SaveContextInput): Promise<SavedContext>;

  abstract findByContentUuid(
    contentUuid: string,
  ): Promise<ProjectContext | null>;
}
