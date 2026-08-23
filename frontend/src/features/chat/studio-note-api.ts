import { fetchJson } from '../../lib/api-client';

export interface StudioNoteDto {
  id: string;
  conversationId: string;
  workspaceId: string;
  userId: string;
  noteType: string;
  title: string;
  content: string;
  metadata?: string | null | undefined;
  createdAt: string;
}

export interface CreateStudioNotePayload {
  noteType: string;
  title: string;
  content: string;
  metadata?: string | undefined;
}

/**
 * Fetch all studio notes for a specific conversation session.
 */
export async function fetchConversationStudioNotes(
  workspaceId: string,
  conversationId: string
): Promise<StudioNoteDto[]> {
  const url = `/workspaces/${encodeURIComponent(workspaceId)}/conversations/${encodeURIComponent(conversationId)}/studio-notes`;
  return fetchJson<StudioNoteDto[]>(url);
}

/**
 * Create and persist a new studio note linked to a conversation in DB.
 */
export async function createStudioNote(
  workspaceId: string,
  conversationId: string,
  payload: CreateStudioNotePayload
): Promise<StudioNoteDto> {
  const url = `/workspaces/${encodeURIComponent(workspaceId)}/conversations/${encodeURIComponent(conversationId)}/studio-notes`;
  return fetchJson<StudioNoteDto>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Delete a studio note by ID from DB.
 */
export async function deleteStudioNote(
  workspaceId: string,
  conversationId: string,
  noteId: string
): Promise<void> {
  const url = `/workspaces/${encodeURIComponent(workspaceId)}/conversations/${encodeURIComponent(conversationId)}/studio-notes/${encodeURIComponent(noteId)}`;
  await fetchJson<void>(url, {
    method: 'DELETE',
  });
}
