import { z } from 'zod';

export const addMemberSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
  role: z.enum(['OWNER', 'EDITOR', 'VIEWER']),
});

export type AddMemberFormValues = z.infer<typeof addMemberSchema>;
