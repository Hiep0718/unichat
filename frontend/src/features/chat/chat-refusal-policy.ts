import type { QuestionResponse } from './chat-types';

interface RefusalOutcome {
  readonly decision: QuestionResponse['decision'];
  readonly refusalCode?: string | null | undefined;
  readonly intent?: string | null | undefined;
}

/** Only an on-topic lack of evidence can turn a refusal into a community question. */
export function isKnowledgeGap(outcome: RefusalOutcome): boolean {
  return outcome.decision === 'REFUSE' && outcome.intent !== 'OUT_OF_SCOPE'
    && (outcome.refusalCode === 'EVIDENCE_INSUFFICIENT' || outcome.refusalCode === 'EVIDENCE_GATE_REFUSAL');
}

/** Completed answers and genuine evidence gaps may be discussed with the community. */
export function canAskCommunity(response: QuestionResponse | undefined): boolean {
  return Boolean(response && !response.redacted && (response.decision === 'ANSWER' || isKnowledgeGap(response)));
}
