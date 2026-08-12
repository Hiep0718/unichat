/**
 * Workspace data types and validation schemas.
 * Maps to Core API WorkspaceResponse and CreateWorkspaceRequest DTOs.
 */
import { z } from 'zod/v4';

/** Workspace visibility options matching backend enum. */
export type WorkspaceVisibility = 'PRIVATE' | 'SHARED' | 'PUBLIC';

/** Join policy for community workspaces. */
export type JoinPolicy = 'OPEN' | 'REQUEST_APPROVAL';

/** Contribution policy for community workspaces. */
export type ContributionPolicy = 'FREE' | 'APPROVAL_REQUIRED';

/** Workspace data returned from the API. */
export interface WorkspaceDto {
  readonly id: string;
  readonly ownerId: string;
  readonly name: string;
  readonly description: string;
  readonly visibility: WorkspaceVisibility;
  readonly cloudAllowed: boolean;
  readonly category: string | null;
  readonly joinPolicy: JoinPolicy | null;
  readonly contributionPolicy: ContributionPolicy | null;
  readonly questionCount: number;
  readonly documentCount: number;
  readonly memberCount: number;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly userRole: 'OWNER' | 'EDITOR' | 'CONTRIBUTOR' | 'VIEWER' | null;
}

/** Workspace category from master data. */
export interface WorkspaceCategoryDto {
  readonly code: string;
  readonly displayName: string;
  readonly icon: string | null;
  readonly sortOrder: number;
}

/** Paginated response from Spring Data Page. */
export interface PagedResponse<T> {
  readonly content: readonly T[];
  readonly totalElements: number;
  readonly totalPages: number;
  readonly number: number;
  readonly size: number;
}

/** Zod schema for creating a new workspace. */
export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(3, 'Tên workspace phải có ít nhất 3 ký tự')
    .max(100, 'Tên workspace tối đa 100 ký tự'),
  description: z
    .string()
    .max(1000, 'Mô tả tối đa 1000 ký tự')
    .optional()
    .default(''),
  visibility: z.enum(['PRIVATE', 'SHARED', 'PUBLIC']),
  category: z.string().max(50).optional(),
  joinPolicy: z.enum(['OPEN', 'REQUEST_APPROVAL']).optional(),
  contributionPolicy: z.enum(['FREE', 'APPROVAL_REQUIRED']).optional(),
});

/** TypeScript type inferred from the Zod schema. */
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type CreateWorkspaceFormValues = CreateWorkspaceInput;

/** Zod schema for updating a workspace (all fields optional except version). */
export const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(3, 'Tên workspace phải có ít nhất 3 ký tự')
    .max(100, 'Tên workspace tối đa 100 ký tự')
    .optional(),
  description: z
    .string()
    .max(1000, 'Mô tả tối đa 1000 ký tự')
    .optional(),
  visibility: z.enum(['PRIVATE', 'SHARED', 'PUBLIC']).optional(),
  expectedVersion: z.number().optional(),
});

/** TypeScript type inferred from the Zod update schema. */
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
