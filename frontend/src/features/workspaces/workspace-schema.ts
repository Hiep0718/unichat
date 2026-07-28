import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(3, 'Tên Workspace phải có ít nhất 3 ký tự')
    .max(100, 'Tên Workspace tối đa 100 ký tự'),
  description: z
    .string()
    .max(1000, 'Mô tả tối đa 1000 ký tự')
    .optional(),
  visibility: z.enum(['PRIVATE', 'SHARED', 'PUBLIC']),
});

export type CreateWorkspaceFormValues = z.infer<typeof createWorkspaceSchema>;
