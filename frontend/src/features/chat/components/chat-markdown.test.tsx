import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatMarkdown } from './chat-markdown';

vi.mock('./mermaid-diagram', () => ({ MermaidDiagram: ({ chart }: { chart: string }) =>
  <span data-testid="diagram">{chart}</span> }));
afterEach(cleanup);

describe('ChatMarkdown', () => {
  it('should display a cited Mermaid diagram as a diagram with a separate citation', () => {
    render(<ChatMarkdown content={'```mermaid\nflowchart LR\nA --> B\n```\n\n[1]'} />);

    expect(screen.getByTestId('diagram').textContent).toContain('A --> B');
    expect(screen.getByTestId('diagram').closest('pre')).toBeNull();
    expect(screen.getByText('[1]')).toBeTruthy();
  });

  it('should render interactive citation badges and trigger onSelectCitation when clicked', () => {
    const onSelectCitation = vi.fn();
    const citation = {
      citationId: '1',
      documentId: 'doc-1',
      fileName: 'OOP.pdf',
      locator: 'page:1',
      excerpt: 'Định nghĩa OOP',
      score: 0.9,
    };

    render(
      <ChatMarkdown
        content="Lập trình hướng đối tượng có 4 đặc trưng. [1]"
        citations={[citation]}
        onSelectCitation={onSelectCitation}
      />
    );

    const citationButton = screen.getByRole('button', { name: '[1]' });
    expect(citationButton).toHaveClass('chat-citation-badge');
    expect(citationButton).toHaveAttribute('title', 'OOP.pdf (page:1)');

    fireEvent.click(citationButton);
    expect(onSelectCitation).toHaveBeenCalledWith(citation);
  });
});
