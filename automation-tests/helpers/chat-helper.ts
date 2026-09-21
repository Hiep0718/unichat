/**
 * Chat interaction helper for benchmark E2E tests.
 * Sends questions via UI and collects structured responses.
 */

import { Page } from '@playwright/test';

/** Maximum time to wait for AI response (streaming can be slow). */
const RESPONSE_TIMEOUT_MS = 120_000;

/** Delay between questions to respect rate limits (Gemini Free tier). */
export const INTER_QUESTION_DELAY_MS = 6_000;

/** Result of a single benchmark question. */
export interface BenchmarkResult {
  readonly questionId: string;
  readonly workspace: string;
  readonly question: string;
  readonly expectedIntent: string;
  readonly expectedDecision: string;
  readonly actualAnswer: string;
  readonly actualDecision: string;
  readonly actualIntent: string;
  readonly citations: string[];
  readonly latencyMs: number;
  readonly ragMode: 'strict' | 'hybrid';
  readonly status: 'SUCCESS' | 'TIMEOUT' | 'ERROR';
  readonly errorMessage?: string;
  readonly timestamp: string;
}

/**
 * Set the RAG mode toggle on the chat input form.
 *
 * @param page - Playwright page in chat view
 * @param mode - 'strict' for document-only or 'hybrid' for RAG + AI expansion
 */
export async function setRagMode(
  page: Page,
  mode: 'strict' | 'hybrid',
): Promise<void> {
  const contextIndicator = page.locator('.chat-input-form__context-indicator');
  if (!(await contextIndicator.isVisible({ timeout: 3_000 }).catch(() => false))) {
    return;
  }

  const isCurrentlyHybrid = await contextIndicator
    .getAttribute('class')
    .then((cls) => cls?.includes('--hybrid') ?? true);

  const wantHybrid = mode === 'hybrid';
  if (isCurrentlyHybrid !== wantHybrid) {
    await contextIndicator.click();
    await page.waitForTimeout(300);
  }
}

/**
 * Send a question via the chat UI and wait for the streaming response to complete.
 *
 * @param page - Playwright page in chat view
 * @param questionId - Unique benchmark question ID
 * @param workspace - Workspace name for labeling
 * @param question - Question text to send
 * @param expectedIntent - Expected intent category
 * @param expectedDecision - Expected decision (ANSWER/REFUSE/CLARIFY)
 * @param ragMode - Current RAG mode setting
 * @returns BenchmarkResult with collected response data
 */
export async function sendQuestionAndCollectResponse(
  page: Page,
  questionId: string,
  workspace: string,
  question: string,
  expectedIntent: string,
  expectedDecision: string,
  ragMode: 'strict' | 'hybrid',
): Promise<BenchmarkResult> {
  const startTime = Date.now();

  try {
    // 1. Fill question into the chat input
    const chatInput = page.locator('.chat-input-form__field');
    await chatInput.waitFor({ state: 'visible', timeout: 10_000 });
    await chatInput.fill(question);

    // 2. Click send button
    const sendBtn = page.locator('.chat-input-form__submit-btn');
    await sendBtn.click();

    // 3. Wait for user message to appear
    const userMsg = page.locator('.chat-msg--user').last();
    await userMsg.waitFor({ state: 'visible', timeout: 10_000 });

    // 4. Wait for assistant streaming message to appear
    const assistantMsg = page.locator('.chat-msg--assistant').last();
    await assistantMsg.waitFor({ state: 'visible', timeout: RESPONSE_TIMEOUT_MS });

    // 5. Wait for streaming to complete (loading indicator disappears)
    await page.waitForFunction(
      () => {
        const submitBtn = document.querySelector('.chat-input-form__submit-btn');
        const loadingRing = document.querySelector('.chat-input-form__loading-ring');
        return submitBtn && !loadingRing;
      },
      { timeout: RESPONSE_TIMEOUT_MS },
    );

    // Small buffer for final token flush
    await page.waitForTimeout(500);

    const latencyMs = Date.now() - startTime;

    // 6. Check for refusal / clarify cards in the DOM
    const isClarify = await assistantMsg
      .locator('.refusal-card--clarify')
      .isVisible({ timeout: 300 })
      .catch(() => false);

    const isRefusal = !isClarify && await assistantMsg
      .locator('.refusal-card--refuse, .refusal-card')
      .isVisible({ timeout: 300 })
      .catch(() => false);

    let actualDecision = 'ANSWER';
    let answerText = '';

    if (isClarify) {
      actualDecision = 'CLARIFY';
      answerText = (await assistantMsg.locator('.refusal-card__reason').textContent().catch(() => ''))?.trim() ?? '';
    } else if (isRefusal) {
      actualDecision = 'REFUSE';
      answerText = (await assistantMsg.locator('.refusal-card__reason').textContent().catch(() => ''))?.trim() ?? '';
    } else {
      const markdownContent = await assistantMsg
        .locator('.chat-msg__markdown')
        .textContent()
        .catch(() => '');
      answerText = markdownContent?.trim() ?? '';

      // Check for textual refusal (disclaimer indicating out of scope or missing info)
      const firstSentence = (answerText.split('.')[0] || '').toLowerCase();
      const isTextualRefusal =
        firstSentence.includes('không có thông tin') ||
        firstSentence.includes('không có bất kỳ thông tin') ||
        firstSentence.includes('hoàn toàn không có thông tin') ||
        firstSentence.includes('tài liệu không chứa') ||
        firstSentence.includes('ngoài phạm vi');

      if (isTextualRefusal) {
        actualDecision = 'REFUSE';
      } else {
        actualDecision = 'ANSWER';
      }
    }

    // 7. Extract intent from intent badge if rendered
    let actualIntent = 'UNKNOWN';
    const intentBadge = assistantMsg.locator('.chat-badge--intent').first();
    if (await intentBadge.isVisible({ timeout: 300 }).catch(() => false)) {
      const text = (await intentBadge.textContent())?.trim() ?? '';
      if (text.includes('Định nghĩa')) actualIntent = 'DEFINITION';
      else if (text.includes('Dữ liệu thực tế')) actualIntent = 'FACT';
      else if (text.includes('So sánh')) actualIntent = 'COMPARISON';
      else if (text.includes('Tóm tắt')) actualIntent = 'SUMMARY';
      else if (text.includes('Quy trình')) actualIntent = 'PROCEDURE';
      else if (text.includes('Tổng quan')) actualIntent = 'REASONING';
      else {
        const m = text.match(/DEFINITION|FACT|COMPARISON|SUMMARY|REASONING|OUT_OF_SCOPE|CLARIFY/i);
        if (m) actualIntent = m[0].toUpperCase();
      }
    }

    // 8. Extract citations
    const citationTexts = await extractCitations(assistantMsg);

    return {
      questionId,
      workspace,
      question,
      expectedIntent,
      expectedDecision,
      actualAnswer: answerText,
      actualDecision,
      actualIntent,
      citations: citationTexts,
      latencyMs,
      ragMode,
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    const latencyMs = Date.now() - startTime;
    const errMsg = error instanceof Error ? error.message : String(error);
    const isTimeout = errMsg.includes('Timeout') || errMsg.includes('timeout');

    return {
      questionId,
      workspace,
      question,
      expectedIntent,
      expectedDecision,
      actualAnswer: '',
      actualDecision: 'ERROR',
      actualIntent: 'UNKNOWN',
      citations: [],
      latencyMs,
      ragMode,
      status: isTimeout ? 'TIMEOUT' : 'ERROR',
      errorMessage: errMsg,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Extract citation text snippets from an assistant message.
 */
async function extractCitations(
  assistantMsg: ReturnType<Page['locator']>,
): Promise<string[]> {
  const citationElements = assistantMsg.locator(
    '.notebook-citation-chip, .notebook-cited-text, .chat-msg__citation, .citation-badge',
  );
  const count = await citationElements.count();

  const citations: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = await citationElements.nth(i).textContent();
    if (text?.trim()) {
      citations.push(text.trim());
    }
  }
  return citations;
}
