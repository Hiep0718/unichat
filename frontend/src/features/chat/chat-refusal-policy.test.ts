import { describe, expect, it } from 'vitest';
import { canAskCommunity, isKnowledgeGap } from './chat-refusal-policy';
import type { QuestionResponse } from './chat-types';

const outcome: QuestionResponse = { messageId: 'message', conversationId: 'conversation', decision: 'REFUSE',
  answer: null, intent: 'FACT', strategyVersion: 'v1', citations: [], refusalCode: null, requestId: 'request' };

describe('ChatRefusalPolicy', () => {
  it.each(['CLOUD_NOT_ALLOWED', 'CLOUD_POLICY_DENIED', 'PROVIDER_UNAVAILABLE', 'AI_MAINTENANCE',
    'SAFETY_REFUSAL', 'NO_DOCUMENTS', 'CITATION_VALIDATION_FAILED', null])(
    'should prevent community escalation for %s', (refusalCode) => {
      expect(canAskCommunity({ ...outcome, refusalCode })).toBe(false);
    });
  it.each(['EVIDENCE_INSUFFICIENT', 'EVIDENCE_GATE_REFUSAL'])('should allow an on-topic evidence gap %s', (refusalCode) => {
    expect(isKnowledgeGap({ ...outcome, refusalCode })).toBe(true);
    expect(canAskCommunity({ ...outcome, refusalCode })).toBe(true);
  });
  it('should prevent escalation for clarification off-topic redacted and unknown results', () => {
    expect(isKnowledgeGap({ ...outcome, decision: 'CLARIFY', refusalCode: 'EVIDENCE_INSUFFICIENT' })).toBe(false);
    expect(isKnowledgeGap({ ...outcome, intent: 'OUT_OF_SCOPE', refusalCode: 'EVIDENCE_INSUFFICIENT' })).toBe(false);
    expect(canAskCommunity({ ...outcome, decision: 'ANSWER', redacted: true })).toBe(false);
    expect(canAskCommunity(undefined)).toBe(false);
  });
  it('should retain community discussion for a completed answer', () => {
    expect(canAskCommunity({ ...outcome, decision: 'ANSWER' })).toBe(true);
  });
});
