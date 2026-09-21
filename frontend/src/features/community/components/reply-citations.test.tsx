import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { ReplyCitations } from './reply-citations';
import type { ReplyCitation } from '../community-api';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);

const citation = (overrides: Partial<ReplyCitation> = {}): ReplyCitation => ({
  citationId: '1',
  documentId: '11111111-1111-1111-1111-111111111111',
  fileName: 'giao-trinh-csdl.pdf',
  locator: 'trang 12',
  excerpt: 'Chỉ mục B-Tree giúp truy vấn nhanh hơn.',
  ...overrides,
});

describe('ReplyCitations', () => {
  it('should render nothing for a human reply, which has no sources', () => {
    // Arrange and Act
    const { container } = render(<ReplyCitations citations={[]} />);

    // Assert
    expect(container).toBeEmptyDOMElement();
  });

  it('should name every document the answer drew on', () => {
    // Arrange and Act
    render(
      <ReplyCitations
        citations={[citation(), citation({ citationId: '2', fileName: 'de-cuong.docx' })]}
      />,
    );

    // Assert
    expect(screen.getByText('Nguồn (2)')).toBeInTheDocument();
    expect(screen.getByText('giao-trinh-csdl.pdf')).toBeInTheDocument();
    expect(screen.getByText('de-cuong.docx')).toBeInTheDocument();
  });

  it('should keep the excerpt hidden until the reader asks for it', () => {
    // Arrange and Act
    render(<ReplyCitations citations={[citation()]} />);

    // Assert
    expect(screen.queryByText(/Chỉ mục B-Tree/)).not.toBeInTheDocument();
  });

  it('should reveal the excerpt so the reader can check the claim', async () => {
    // Arrange
    render(<ReplyCitations citations={[citation()]} />);

    // Act
    await userEvent.click(screen.getByRole('button'));

    // Assert
    expect(screen.getByText(/Chỉ mục B-Tree/)).toBeInTheDocument();
  });

  it('should collapse the excerpt again when the same source is clicked twice', async () => {
    // Arrange
    render(<ReplyCitations citations={[citation()]} />);
    const chip = screen.getByRole('button');

    // Act
    await userEvent.click(chip);
    await userEvent.click(chip);

    // Assert
    expect(screen.queryByText(/Chỉ mục B-Tree/)).not.toBeInTheDocument();
  });

  it('should omit the locator when the source does not have one', () => {
    // Arrange and Act
    render(<ReplyCitations citations={[citation({ locator: null })]} />);

    // Assert
    expect(screen.queryByText('trang 12')).not.toBeInTheDocument();
  });
});
