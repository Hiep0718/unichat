import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchJson } from '../../lib/api-client';
import { WorkspaceSummarySource } from './workspace-summary-source';

vi.mock('../../lib/api-client', () => ({ fetchJson: vi.fn() }));
vi.mock('./components/citation-drawer', () => ({ CitationDrawer: ({ citation }: {
  citation: { fileName: string; locator: string; excerpt: string }
}) => <div>{citation.fileName} {citation.locator} {citation.excerpt}</div> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('WorkspaceSummarySource', () => {
  it('should reauthorize the canonical citation before opening its original location', async () => {
    const chunkId = '00000000-0000-4000-8000-000000000001_1';
    vi.mocked(fetchJson).mockResolvedValueOnce({
      documentId: '00000000-0000-4000-8000-000000000001', fileName: 'Giáo trình.pdf',
      chunkId, locator: 'page:7', excerpt: 'Nội dung trang bảy', contentHash: 'a'.repeat(64),
      ingestionVersion: 2,
    });
    render(<WorkspaceSummarySource workspaceId="workspace" summaryId="summary" chunkId={chunkId} />);

    fireEvent.click(screen.getByRole('button', { name: `Mở nguồn ${chunkId}` }));

    await waitFor(() => expect(screen.getByText(/Giáo trình.pdf page:7 Nội dung trang bảy/)).toBeTruthy());
    expect(fetchJson).toHaveBeenCalledWith(`/workspaces/workspace/workspace-summaries/summary/citations/${chunkId}`);
  });

  it('should refuse to show a citation when the authorized read fails', async () => {
    vi.mocked(fetchJson).mockRejectedValueOnce(new Error('Nguồn đã thay đổi'));
    render(<WorkspaceSummarySource workspaceId="workspace" summaryId="summary" chunkId="chunk_1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Mở nguồn chunk_1' }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Nguồn đã thay đổi'));
  });
});
