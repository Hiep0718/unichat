/**
 * The box a message is written in, with its files.
 *
 * Files are gathered here and sent together with the text in one request, so
 * the recipient never sees a bubble whose attachment is still uploading. The
 * batch is checked against the same rules as the server before anything is
 * sent, which spares the user a 20 MiB round trip to be told no.
 */
import { useRef, useState } from 'react';

import { Icon } from '../../../components/icon';
import { ApiError } from '../../../lib/api-client';
import { formatBytes } from '../../../lib/format-bytes';
import {
  CHAT_FILE_TYPES,
  CHAT_IMAGE_TYPES,
  MAX_CHAT_FILES,
  describeFileRejection,
} from '../work-chat-api';
import './chat-composer.css';

interface ChatComposerProps {
  /** Resolves once the message is stored; rejects to keep the draft. */
  readonly onSend: (
    body: string,
    files: readonly File[],
    onProgress?: (percent: number) => void,
  ) => Promise<void>;
}

const ACCEPT = [...CHAT_IMAGE_TYPES, ...CHAT_FILE_TYPES].join(',');

export function ChatComposer({ onSend }: ChatComposerProps) {
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const canSend = (draft.trim().length > 0 || files.length > 0) && !sending;

  /** Adds files, rejecting the whole batch rather than part of it. */
  const accept = (incoming: readonly File[]) => {
    if (incoming.length === 0) return;
    const next = [...files, ...incoming];
    const rejection = describeFileRejection(next);
    if (rejection) {
      setError(rejection);
      return;
    }
    setError(null);
    setFiles(next);
  };

  const removeAt = (index: number) => {
    setFiles(files.filter((_, position) => position !== index));
    setError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSend) return;

    setSending(true);
    setProgress(0);
    setError(null);
    try {
      await onSend(draft.trim(), files, setProgress);
      setDraft('');
      setFiles([]);
    } catch (failure) {
      // The draft and its files are kept, so a failed send loses nothing.
      setError(reasonFor(failure));
    } finally {
      setSending(false);
    }
  };

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(true);
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    accept(Array.from(event.dataTransfer.files));
  };

  const onPickFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    accept(Array.from(event.target.files ?? []));
    // Cleared so that picking the same file twice still fires a change.
    event.target.value = '';
  };

  return (
    <form
      className={`chat-composer ${dragging ? 'chat-composer--dragging' : ''}`}
      onSubmit={submit}
      onDragOver={onDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {error && (
        <p className="chat-composer__error" role="alert">
          {error}
        </p>
      )}

      <ComposerChips files={files} disabled={sending} onRemove={removeAt} />

      {sending && files.length > 0 && (
        <p className="chat-composer__progress" role="status">
          Đang gửi {files.length} tệp… {progress}%
        </p>
      )}

      <div className="chat-composer__row">
        <input
          ref={fileInput}
          type="file"
          className="chat-composer__file-input"
          multiple
          accept={ACCEPT}
          aria-label="Chọn tệp để gửi"
          onChange={onPickFiles}
        />
        <button
          type="button"
          className="chat-composer__attach"
          onClick={() => fileInput.current?.click()}
          disabled={sending || files.length >= MAX_CHAT_FILES}
          aria-label="Đính kèm tệp"
        >
          <Icon name="attach_file" size={20} />
        </button>

        <input
          className="chat-composer__input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onPaste={(event) => accept(Array.from(event.clipboardData.files))}
          placeholder="Nhập tin nhắn..."
          maxLength={4000}
          aria-label="Nội dung tin nhắn"
        />

        <button
          type="submit"
          className="chat-composer__send"
          disabled={!canSend}
          aria-label="Gửi"
        >
          <Icon name="send" size={18} />
        </button>
      </div>
    </form>
  );
}

/**
 * The server's own words when it gave any, a friendly line otherwise.
 *
 * An ApiError carries a reason written for the person reading it, such as
 * which file was too large. Anything else is an unexpected failure whose
 * message is not fit to show.
 */
function reasonFor(failure: unknown): string {
  return failure instanceof ApiError ? failure.message : 'Không gửi được. Thử lại nhé.';
}

interface ComposerChipsProps {
  readonly files: readonly File[];
  readonly disabled: boolean;
  readonly onRemove: (index: number) => void;
}

/** What is about to be sent, with a way to drop any of it. */
function ComposerChips({ files, disabled, onRemove }: ComposerChipsProps) {
  if (files.length === 0) return null;

  return (
    <ul className="chat-composer__chips">
      {files.map((file, index) => (
        <li className="chat-composer__chip" key={`${file.name}-${index}`}>
          <Icon name={file.type.startsWith('image/') ? 'image' : 'description'} size={16} />
          <span className="chat-composer__chip-name">{file.name}</span>
          <span className="chat-composer__chip-size">{formatBytes(file.size)}</span>
          <button
            type="button"
            className="chat-composer__chip-remove"
            onClick={() => onRemove(index)}
            disabled={disabled}
            aria-label={`Bỏ ${file.name}`}
          >
            <Icon name="close" size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
}
