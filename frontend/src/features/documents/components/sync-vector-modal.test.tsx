import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchManifestStatus, repairDocumentManifests } from '../document-api';
import { SyncVectorModal } from './sync-vector-modal';

vi.mock('../document-api', () => ({ fetchManifestStatus: vi.fn(), repairDocumentManifests: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('SyncVectorModal', () => {
  it('should queue only workspace manifest repair through Core', async () => {
    vi.mocked(fetchManifestStatus).mockResolvedValue({ missingManifests: 2, failedDocuments: 0 });
    vi.mocked(repairDocumentManifests).mockResolvedValue({ queuedDocuments: 2 });
    render(<SyncVectorModal isOpen workspaceId="workspace" onClose={vi.fn()} />);
    await screen.findByText('2 tài liệu đã xử lý cần tạo lại manifest.');

    fireEvent.click(screen.getByRole('button', { name: 'Sửa manifest' }));

    await waitFor(() => expect(repairDocumentManifests).toHaveBeenCalledWith('workspace'));
    expect(screen.getByRole('status').textContent).toContain('2 tài liệu');
  });
});
