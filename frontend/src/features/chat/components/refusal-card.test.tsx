import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RefusalCard } from './refusal-card';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);

describe('RefusalCard — knowledge gap escalation', () => {
  // The blocking endpoint and the SSE endpoint report the same evidence-gate
  // decision under different codes, so both must offer the escalation.
  it.each([
    ['EVIDENCE_INSUFFICIENT', 'blocking endpoint'],
    ['EVIDENCE_GATE_REFUSAL', 'streaming endpoint'],
  ])('should offer to ask the community for %s from the %s', (refusalCode) => {
    // Arrange and Act
    render(
      <RefusalCard
        decision="REFUSE"
        refusalCode={refusalCode}
        intent="FACT"
        refusalReason="Tài liệu hiện có chưa đủ bằng chứng."
        onAskCommunity={vi.fn()}
      />
    );

    // Assert
    expect(screen.getByRole('button', { name: /Hỏi cộng đồng/i })).toBeInTheDocument();
  });

  it('should not offer the community for an off-topic or abusive question', () => {
    // Arrange and Act — the gate reports a knowledge-gap code, but the question
    // itself is off-topic, so no member should be asked to answer it.
    render(
      <RefusalCard
        decision="REFUSE"
        refusalCode="EVIDENCE_GATE_REFUSAL"
        intent="OUT_OF_SCOPE"
        refusalReason="Câu hỏi nằm ngoài phạm vi hỗ trợ của hệ thống."
        onAskCommunity={vi.fn()}
      />
    );

    // Assert
    expect(screen.queryByRole('button', { name: /Hỏi cộng đồng/i })).not.toBeInTheDocument();
  });

  it('should call the escalation handler when the community button is pressed', async () => {
    // Arrange
    const onAskCommunity = vi.fn();
    render(
      <RefusalCard
        decision="REFUSE"
        refusalCode="EVIDENCE_INSUFFICIENT"
        intent="FACT"
        onAskCommunity={onAskCommunity}
      />
    );

    // Act
    await userEvent.click(screen.getByRole('button', { name: /Hỏi cộng đồng/i }));

    // Assert
    expect(onAskCommunity).toHaveBeenCalledTimes(1);
  });

  it('should not offer the community when the question itself needs clarifying', () => {
    // Arrange and Act
    render(
      <RefusalCard
        decision="CLARIFY"
        refusalCode="CLARIFY_REQUIRED"
        onAskCommunity={vi.fn()}
      />
    );

    // Assert
    expect(screen.queryByRole('button', { name: /Hỏi cộng đồng/i })).not.toBeInTheDocument();
  });

  it.each([
    'NO_ALLOWED_DOCUMENTS',
    'PROVIDER_UNAVAILABLE',
    'CITATION_VALIDATION_FAILED',
    'REJECTED_CITATIONS',
  ])('should not offer the community for the system-side refusal %s', (refusalCode) => {
    // Arrange and Act
    render(
      <RefusalCard decision="REFUSE" refusalCode={refusalCode} onAskCommunity={vi.fn()} />
    );

    // Assert
    expect(screen.queryByRole('button', { name: /Hỏi cộng đồng/i })).not.toBeInTheDocument();
  });

  it('should hide the escalation when no handler is supplied', () => {
    // Arrange and Act
    render(<RefusalCard decision="REFUSE" refusalCode="EVIDENCE_INSUFFICIENT" />);

    // Assert
    expect(screen.queryByRole('button', { name: /Hỏi cộng đồng/i })).not.toBeInTheDocument();
  });
});
