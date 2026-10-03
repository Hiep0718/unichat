/**
 * Workspace data types and validation schemas.
 * Maps to Core API WorkspaceResponse and CreateWorkspaceRequest DTOs.
 */
import { z } from 'zod/v4';

/** Workspace visibility options matching backend enum. */
export type WorkspaceVisibility = 'PRIVATE' | 'SHARED' | 'PUBLIC';

/** One member as a workspace card draws them. */
export interface WorkspaceFace {
  readonly userId: string;
  readonly displayName: string;
  readonly hasAvatar: boolean;
  readonly avatarColor: string | null;
}

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
  /** Posts in the last week, so a dormant group reads as dormant. */
  readonly recentPostCount: number;
  /** A few members to draw as faces on the card, owners first. */
  readonly faces: readonly WorkspaceFace[];
  /** True when a cover was uploaded; otherwise the card draws a gradient. */
  readonly hasCover: boolean;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly userRole: 'OWNER' | 'EDITOR' | 'VIEWER' | null;
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
