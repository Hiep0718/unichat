/**
 * Shared API and DTO interfaces for UniChat Mobile.
 * Synchronized with Core API contracts and web frontend.
 */

// Auth DTOs
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface MobileLoginResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
}

export interface UserResponse {
  id: string;
  email: string;
  displayName?: string;
  hasAvatar?: boolean;
  avatarColor?: string | null;
  role?: 'USER' | 'ADMIN';
  systemRole?: 'USER' | 'ADMIN';
  status?: 'ACTIVE' | 'LOCKED' | 'PENDING';
  createdAt?: string;
}

// Workspace DTOs
export interface WorkspaceSummary {
  id: string;
  name: string;
  description: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  documentCount: number;
  memberCount: number;
  createdAt: string;
  updatedAt?: string;
}

// Document DTOs
export interface DocumentItem {
  id: string;
  workspaceId: string;
  fileName: string;
  fileType: string;
  byteSize: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  errorMessage?: string | null;
}

export type { CitationItem, QuestionResponse, AskQuestionPayload, SseMetadataPayload, SseThoughtPayload, SseDonePayload, StreamQuestionCallbacks, AnswerSection, ChatOperation } from '../features/chat/chat-types';
import type { CitationItem, AnswerSection } from '../features/chat/chat-types';

// Conversation History DTOs
export interface ConversationItem {
  id: string;
  workspaceId: string;
  title: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  operationId?: string | null;
  sender: 'USER' | 'ASSISTANT';
  content: string;
  citations?: CitationItem[];
  sequence?: number;
  redacted?: boolean;
  knowledgeMode?: 'STRICT' | 'EXPANDED';
  sections?: AnswerSection[];
  provisional?: boolean;
  intent?: string | null;
  refusalCode?: string | null;
  createdAt: string;
}
