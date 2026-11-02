import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  deleteWorkspaceDocument,
  DocumentResponse,
  fetchWorkspaceDocuments,
} from '../document-api';
import { DocumentTable } from './document-table';

vi.mock('../document-api', () => ({
  fetchWorkspaceDocuments: vi.fn(),
  uploadWorkspaceDocuments: vi.fn(),
  deleteWorkspaceDocument: vi.fn(),
}));

vi.mock('../../../components/loading-screen', () => ({
  LoadingInline: ({ label }: { label: string }) => <div role="status">{label}</div>,
}));

vi.mock('./contribution-modal', () => ({ ContributionModal: () => null }));
vi.mock('./pdf-split-modal', () => ({ PdfSplitModal: () => null }));
vi.mock('./sync-vector-modal', () => ({ SyncVectorModal: () => null }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

/**
 * The list lives in the React Query cache, so the component needs a client.
 * One per render keeps a test's rows out of the next test's cache.
 */
function renderTable(canEdit: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DocumentTable workspaceId="workspace-1" canEdit={canEdit} />
    </QueryClientProvider>
  );
}

/** The rows name the file they remove, so there is one button per row. */
const DELETE_BUTTON = { name: 'Xoá tai-lieu.pdf' } as const;

const processingDocument: DocumentResponse = {
  id: 'document-1',
  workspaceId: 'workspace-1',
  storageKey: 'document-1.pdf',
  originalName: 'tai-lieu.pdf',
  mediaType: 'application/pdf',
  byteSize: 1024,
  sha256: 'hash',
  status: 'PROCESSING',
  ingestionVersion: 1,
  pageOrBlockCount: 1,
  version: 1,
  createdAt: '2026-10-25T00:00:00Z',
  updatedAt: '2026-10-25T00:00:00Z',
  uploadedBy: null,
  uploadedByEmail: null,
  approvedBy: null,
  approvedAt: null,
  rejectionReason: null,
  contributionSummary: null,
  contributionReason: null,
};

const processingPage = {
  content: [processingDocument],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 20,
} satisfies Awaited<ReturnType<typeof fetchWorkspaceDocuments>>;

const duplicateNameDocuments: DocumentResponse[] = [
  { ...processingDocument, id: 'document-1', status: 'PROCESSED' },
  { ...processingDocument, id: 'document-2', status: 'PROCESSED' },
];

const duplicateNamePage = {
  ...processingPage,
  content: duplicateNameDocuments,
  totalElements: duplicateNameDocuments.length,
} satisfies Awaited<ReturnType<typeof fetchWorkspaceDocuments>>;

describe('DocumentTable', () => {
  it('keeps the document list visible while polling ingestion status', async () => {
    vi.useFakeTimers();
    let resolvePoll:
      | ((value: Awaited<ReturnType<typeof fetchWorkspaceDocuments>>) => void)
      | undefined;
    vi.mocked(fetchWorkspaceDocuments)
      .mockResolvedValueOnce(processingPage)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePoll = resolve;
          })
      );

    renderTable(false);

    // React Query settles over several microtask turns, and the fake clock
    // means findBy* would never tick, so the queue is drained explicitly.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText('tai-lieu.pdf')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.getByText('tai-lieu.pdf')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await act(async () => {
      resolvePoll?.(processingPage);
      await vi.advanceTimersByTimeAsync(0);
    });
  });

    it('opens the in-app confirmation and cancels without calling delete', async () => {
      vi.mocked(fetchWorkspaceDocuments).mockResolvedValue(duplicateNamePage);
      const nativeConfirm = vi.spyOn(window, 'confirm');
      renderTable(true);

      const deleteButtons = await screen.findAllByRole('button', DELETE_BUTTON);
      fireEvent.click(deleteButtons[0]!);

      const dialog = screen.getByRole('dialog', { name: 'Xác nhận xóa tài liệu' });
      expect(within(dialog).getByText('tai-lieu.pdf')).toBeInTheDocument();
      expect(nativeConfirm).not.toHaveBeenCalled();

      fireEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(deleteWorkspaceDocument).not.toHaveBeenCalled();
    });

    it('deletes only the selected ID when documents share the same filename', async () => {
      vi.mocked(fetchWorkspaceDocuments).mockResolvedValue(duplicateNamePage);
      vi.mocked(deleteWorkspaceDocument).mockResolvedValue(undefined);
      renderTable(true);

      const deleteButtons = await screen.findAllByRole('button', DELETE_BUTTON);
      fireEvent.click(deleteButtons[0]!);
      const dialog = screen.getByRole('dialog', { name: 'Xác nhận xóa tài liệu' });
      fireEvent.change(within(dialog).getByRole('textbox', { name: 'Tên tài liệu' }), {
        target: { value: 'tai-lieu.pdf' },
      });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Xóa tài liệu' }));

      await waitFor(() => {
        expect(deleteWorkspaceDocument).toHaveBeenCalledExactlyOnceWith(
          'workspace-1',
          'document-1'
        );
      });
      expect(await screen.findAllByText('tai-lieu.pdf')).not.toHaveLength(0);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(vi.mocked(fetchWorkspaceDocuments).mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('keeps the modal open and reports a delete failure', async () => {
      vi.mocked(fetchWorkspaceDocuments).mockResolvedValue(duplicateNamePage);
      vi.mocked(deleteWorkspaceDocument).mockRejectedValue(new Error('Máy chủ từ chối xóa'));
      renderTable(true);

      const deleteButtons = await screen.findAllByRole('button', DELETE_BUTTON);
      fireEvent.click(deleteButtons[0]!);
      const dialog = screen.getByRole('dialog', { name: 'Xác nhận xóa tài liệu' });
      fireEvent.change(within(dialog).getByRole('textbox', { name: 'Tên tài liệu' }), {
        target: { value: 'tai-lieu.pdf' },
      });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Xóa tài liệu' }));

      expect(await within(dialog).findByRole('alert')).toHaveTextContent('Máy chủ từ chối xóa');
      expect(within(screen.getByRole('list')).getAllByText('tai-lieu.pdf')).toHaveLength(2);
    });

    it('disables repeated confirmation while deletion is pending', async () => {
      vi.mocked(fetchWorkspaceDocuments).mockResolvedValue(duplicateNamePage);
      let resolveDelete: (() => void) | undefined;
      vi.mocked(deleteWorkspaceDocument).mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveDelete = resolve;
          })
      );
      renderTable(true);

      const deleteButtons = await screen.findAllByRole('button', DELETE_BUTTON);
      fireEvent.click(deleteButtons[0]!);
      const dialog = screen.getByRole('dialog', { name: 'Xác nhận xóa tài liệu' });
      fireEvent.change(within(dialog).getByRole('textbox', { name: 'Tên tài liệu' }), {
        target: { value: 'tai-lieu.pdf' },
      });
      const confirmButton = within(dialog).getByRole('button', { name: 'Xóa tài liệu' });
      fireEvent.click(confirmButton);

      expect(confirmButton).toBeDisabled();
      expect(within(dialog).getByRole('button', { name: 'Hủy' })).toBeDisabled();
      expect(deleteWorkspaceDocument).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveDelete?.();
      });
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
});
