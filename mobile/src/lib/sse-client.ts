/**
 * Server-Sent Events (SSE) streaming client for AI Chat.
 * Utilizes expo/fetch for WinterCG-compliant ReadableStream support on React Native.
 */

import { fetch } from 'expo/fetch';
import * as SecureStore from './secure-store';
import { getApiBaseUrl, getAccessToken } from './api-client';
import {
  AskQuestionPayload,
  StreamQuestionCallbacks,
  SseMetadataPayload,
  SseThoughtPayload,
  SseDonePayload,
} from '../types/api';

/**
 * Streams AI answers in real-time from Core API.
 */
export async function streamChatResponse(
  workspaceId: string,
  payload: AskQuestionPayload,
  callbacks: StreamQuestionCallbacks
): Promise<void> {
  let token = getAccessToken();
  if (!token) {
    token = await SecureStore.getItemAsync('access_token');
  }

  const baseUrl = getApiBaseUrl();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client-Type': 'mobile',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}/api/v1/workspaces/${workspaceId}/questions/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    let errorMsg = `Lỗi kết nối stream AI (HTTP ${response.status})`;
    try {
      const errJson = await response.json();
      errorMsg = errJson.detail || errJson.message || errorMsg;
    } catch {
      // Ignore json parse error on non-json error responses
    }
    const err = new Error(errorMsg);
    callbacks.onError?.(err);
    throw err;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8'); // Polyfilled by fast-text-encoding
  let buffer = '';
  let currentEvent = '';
  let hasEmittedDone = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.substring(6).trim();
        } else if (trimmed.startsWith('data:')) {
          const dataStr = trimmed.substring(5).trim();
          if (!dataStr) continue;

          try {
            const dataObj = JSON.parse(dataStr);
            if (currentEvent === 'metadata') {
              callbacks.onMetadata?.(dataObj as SseMetadataPayload);
            } else if (currentEvent === 'thought') {
              callbacks.onThought?.(dataObj as SseThoughtPayload);
            } else if (currentEvent === 'token') {
              callbacks.onToken?.(dataObj.delta || '');
            } else if (currentEvent === 'done') {
              hasEmittedDone = true;
              callbacks.onDone?.(dataObj as SseDonePayload);
            }
          } catch {
            // Incomplete chunk buffer, will parse on next data delivery
          }
          currentEvent = '';
        }
      }
    }

    if (!hasEmittedDone) {
      callbacks.onDone?.({ messageId: 'done' });
    }
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    callbacks.onError?.(error);
    throw error;
  }
}
