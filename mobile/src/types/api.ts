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
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface UserResponse {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'LOCKED' | 'PENDING';
  createdAt: string;
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

// Chat & Citation DTOs
export interface CitationItem {
  citationId?: string;
  documentId: string;
  fileName?: string;
  locator: string;
  excerpt: string;
  score: number;
}

export interface QuestionResponse {
  messageId: string;
  conversationId: string;
  decision: 'ANSWER' | 'CLARIFY' | 'REFUSE';
  answer: string | null;
  intent: string;
  strategyVersion: string;
  citations: CitationItem[];
  refusalCode: string | null;
  refusalReason?: string | null;
  providerModel?: string | null;
  evidenceScore?: number | null;
  singleSourceWarning?: boolean;
  warningMessage?: string | null;
  requestId: string;
}

export interface AskQuestionPayload {
  question: string;
  conversationId?: string;
  allowExternalKnowledge?: boolean;
}

// SSE Streaming Payloads
export interface SseMetadataPayload {
  conversationId?: string;
  decision?: 'ANSWER' | 'CLARIFY' | 'REFUSE';
  intent?: string;
  strategyVersion?: string;
  citations?: CitationItem[];
  refusalCode?: string | null;
  refusalReason?: string | null;
  providerModel?: string;
  evidenceScore?: number | null;
  singleSourceWarning?: boolean;
  warningMessage?: string | null;
  requestId?: string;
}

export interface SseThoughtPayload {
  stepIndex: number;
  stepKey: string;
  title: string;
  detail: string;
}

export interface SseDonePayload {
  messageId: string;
  conversationId?: string;
  refusalCode?: string | null;
  providerModel?: string;
}

export interface StreamQuestionCallbacks {
  onMetadata?: (metadata: SseMetadataPayload) => void;
  onThought?: (thought: SseThoughtPayload) => void;
  onToken?: (delta: string) => void;
  onDone?: (done: SseDonePayload) => void;
  onError?: (error: Error) => void;
}

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
  sender: 'USER' | 'ASSISTANT';
  content: string;
  citations?: CitationItem[];
  intent?: string | null;
  refusalCode?: string | null;
  createdAt: string;
}
