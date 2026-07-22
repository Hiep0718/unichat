/**
 * Workspace data types and validation schemas.
 * Maps to Core API WorkspaceResponse and CreateWorkspaceRequest DTOs.
 */
import { z } from 'zod/v4';

/** Workspace visibility options matching backend enum. */
export type WorkspaceVisibility = 'PRIVATE' | 'SHARED' | 'PUBLIC';

/** Workspace data returned from the API. */
export interface WorkspaceDto {
  readonly id: string;
  readonly ownerId: string;
  readonly name: string;
  readonly description: string;
  readonly visibility: WorkspaceVisibility;
  readonly cloudAllowed: boolean;
  readonly documentCount: number;
  readonly memberCount: number;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
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
});

/** TypeScript type inferred from the Zod schema. */
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
