/**
 * Looks inside a document before deciding what to do with it.
 *
 * An approver is deciding whether this belongs in the group's knowledge base,
 * and the contributor's own description is written by someone who already knows
 * what the file says — in practice it reads "update". Nothing substitutes for
 * opening the file.
 *
 * The content endpoint needs a bearer token, which an `<iframe src>` pointing at
 * the API cannot send, so the file is fetched as a blob and shown from an
 * object URL.
 */
import { useEffect, useState } from 'react';

import { Icon } from '../../../components/icon';
import { fetchBlob } from '../../../lib/api-client';
import './document-preview.css';

interface DocumentPreviewProps {
  readonly workspaceId: string;
  readonly documentId: string;
  readonly originalName: string;
  readonly mediaType: string;
}

type PreviewState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly url: string; readonly text: string | null }
  | { readonly status: 'failed' };

/** Browsers render PDFs themselves; nothing else previews without a converter. */
function isPdf(mediaType: string): boolean {
  return mediaType === 'application/pdf';
}

function isPlainText(mediaType: string): boolean {
  return mediaType === 'text/plain';
}

export function DocumentPreview({
  workspaceId,
  documentId,
  originalName,
  mediaType,
}: DocumentPreviewProps) {
  const [state, setState] = useState<PreviewState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;

    fetchBlob(`/workspaces/${workspaceId}/documents/${documentId}/download`)
      .then(async (blob) => {
        // A text file is read as text; everything else is handed to the browser
        // as a URL it can render or download.
        const text = isPlainText(mediaType) ? await blob.text() : null;
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        created = url;
        setState({ status: 'ready', url, text });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'failed' });
      });

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [workspaceId, documentId, mediaType]);

  if (state.status === 'loading') {
    return <p className="document-preview__state">Đang mở tài liệu...</p>;
  }

  if (state.status === 'failed') {
    return (
      <p className="document-preview__state document-preview__state--error">
        <Icon name="error_outline" size={16} /> Không mở được tài liệu này.
      </p>
    );
  }

  if (isPdf(mediaType)) {
    return (
      <div className="document-preview">
        <iframe className="document-preview__frame" src={state.url} title={originalName} />
        <OpenInTab url={state.url} />
      </div>
    );
  }

  if (state.text !== null) {
    return (
      <div className="document-preview">
        <pre className="document-preview__text">{state.text}</pre>
      </div>
    );
  }

  // DOCX and anything else: the browser cannot render it in place, so the
  // honest option is to hand the file over rather than show an empty frame.
  return (
    <div className="document-preview">
      <p className="document-preview__state">
        Không xem trực tiếp được định dạng này.
      </p>
      <a className="document-preview__download" href={state.url} download={originalName}>
        <Icon name="download" size={16} /> Tải xuống để xem
      </a>
    </div>
  );
}

/** A full window helps for a long document the inline frame makes cramped. */
function OpenInTab({ url }: { readonly url: string }) {
  return (
    <a
      className="document-preview__download"
      href={url}
      target="_blank"
      rel="noreferrer"
    >
      <Icon name="open_in_new" size={16} /> Mở toàn màn hình
    </a>
  );
}
