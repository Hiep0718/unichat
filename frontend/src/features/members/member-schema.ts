/**
 * Member data types for workspace membership management.
 * Maps to Core API MemberResponse and InviteMemberRequest DTOs.
 */
import { z } from 'zod/v4';

/** Workspace member roles matching backend enum. */
export type MemberRole = 'OWNER' | 'EDITOR' | 'VIEWER';

/** Workspace member status matching backend enum. */
export type MemberStatus = 'ACTIVE' | 'REVOKED';

/** Member data returned from the API. */
export interface MemberDto {
  readonly userId: string;
  readonly email: string;
  readonly role: MemberRole;
  readonly status: MemberStatus;
  readonly invitedById: string | null;
}

/** Zod schema for inviting a new member. */
export const inviteMemberSchema = z.object({
  email: z
    .string()
    .min(1, 'Email không được để trống')
    .email('Email không hợp lệ')
    .max(254, 'Email tối đa 254 ký tự'),
  role: z.enum(['EDITOR', 'VIEWER']),
});

/** TypeScript type inferred from the Zod invite schema. */
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

/** Role display labels in Vietnamese. */
export const ROLE_LABELS: Record<MemberRole, string> = {
  OWNER: 'Chủ sở hữu',
  EDITOR: 'Biên tập viên',
  VIEWER: 'Người xem',
};
