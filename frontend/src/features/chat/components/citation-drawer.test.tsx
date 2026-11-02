import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCitationDocument } from '../use-citation-document';
import { CitationDrawer } from './citation-drawer';

vi.mock('../use-citation-document', () => ({ useCitationDocument: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('CitationDrawer', () => {
  it('should open a summary PDF at the cited page', () => {
    vi.mocked(useCitationDocument).mockReturnValue({ blobUrl: 'blob:verified', fileError: null,
      fileLoading: false });
    render(<CitationDrawer workspaceId="workspace" onClose={vi.fn()} openAtSource citation={{
      documentId: 'document', fileName: 'Giáo trình.pdf', locator: 'page:7',
      excerpt: 'Nguồn gốc', score: 1,
    }} />);

    expect(screen.getByTitle('Tài liệu Giáo trình.pdf').getAttribute('src')).toBe('blob:verified#page=7');
  });

  it('should display the excerpt chunk card with copy functionality', async () => {
    vi.mocked(useCitationDocument).mockReturnValue({ blobUrl: null, fileError: null, fileLoading: false });
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: writeTextMock } });

    render(<CitationDrawer workspaceId="workspace" onClose={vi.fn()} citation={{
      documentId: 'document-1', fileName: 'OOP_Tong_Quan.pdf', locator: 'page:1',
      excerpt: 'Lập trình hướng đối tượng là phương pháp tiếp cận...', score: 0.95,
    }} />);

    expect(screen.getAllByText('Trang 1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Lập trình hướng đối tượng là phương pháp tiếp cận...')).toBeInTheDocument();

    const copyBtn = screen.getByRole('button', { name: /Sao chép/ });
    expect(copyBtn).toBeInTheDocument();

    fireEvent.click(copyBtn);
    expect(writeTextMock).toHaveBeenCalledWith('Lập trình hướng đối tượng là phương pháp tiếp cận...');
  });
});
