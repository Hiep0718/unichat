/**
 * Member data types for workspace membership management.
 * Maps to Core API MemberResponse and InviteMemberRequest DTOs.
 */

import { z } from 'zod';

export type MemberRole = 'OWNER' | 'EDITOR' | 'VIEWER';
export type MemberStatus = 'ACTIVE' | 'REVOKED';

export interface MemberDto {
  readonly userId: string;
  readonly email: string;
  readonly role: MemberRole;
  readonly status: MemberStatus;
  readonly invitedById: string | null;
}

export const inviteMemberSchema = z.object({
  email: z
    .string()
    .min(1, 'Email không được để trống')
    .email('Email không hợp lệ')
    .max(254, 'Email tối đa 254 ký tự'),
  role: z.enum(['EDITOR', 'VIEWER']),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const addMemberSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
  role: z.enum(['OWNER', 'EDITOR', 'VIEWER']),
});

export type AddMemberFormValues = z.infer<typeof addMemberSchema>;

export const ROLE_LABELS: Record<MemberRole, string> = {
  OWNER: 'Chủ sở hữu',
  EDITOR: 'Biên tập viên',
  VIEWER: 'Người xem',
};
