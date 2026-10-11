import { z } from 'zod';

/** Bounds admin list navigation using the shared API pagination contract. */
export const adminPageSchema = z.object({ page: z.number().int().nonnegative(), size: z.number().int().min(1).max(100) });
/** Selects a stable registry identity, never a mutable array index. */
export const keyIdSchema = z.string().regex(/^(gemini-primary|gemini-secondary|gemini-list-[a-f0-9]{12})$/);
/** Restricts explicitly selected provider model names. */
export const modelNameSchema = z.string().min(1).max(100).regex(/^[A-Za-z0-9._/-]+$/);
/** Protects mutations against stale versions and invalid identities. */
export const userMutationSchema = z.object({ userId: z.uuid(), expectedVersion: z.number().int().nonnegative() });
/** Requires a direct admin prompt and an explicit model from the registry. */
export const quickPromptSchema = z.object({ prompt: z.string().min(1).max(2000).refine((value) => value.trim().length > 0),
  keyId: keyIdSchema, model: modelNameSchema });
