import type { UpdateWorkspaceInput, WorkspaceDto } from './workspace-schema';

/** Applies a partial update exactly as a successful workspace API fixture would. */
export function applyWorkspaceUpdateFixture(
  workspace: WorkspaceDto,
  input: UpdateWorkspaceInput,
): WorkspaceDto {
  return {
    ...workspace,
    name: input.name ?? workspace.name,
    description: input.description ?? workspace.description,
    visibility: input.visibility ?? workspace.visibility,
    cloudAllowed: input.cloudAllowed ?? workspace.cloudAllowed,
    version: input.expectedVersion + 1,
  };
}
