/**
 * Files inside a message bubble.
 *
 * Images render inline, everything else as a download chip. Both go through the
 * authorised endpoint rather than a plain URL, because the bytes are private to
 * the conversation and the server checks participation on every read.
 */
import { useEffect, useState } from 'react';

import { Icon } from '../../../components/icon';
import { formatBytes } from '../../../lib/format-bytes';
import { fetchChatAttachmentObjectUrl } from '../work-chat-api';
import type { ChatAttachment } from '../work-chat-api';
import './message-attachments.css';

interface MessageAttachmentsProps {
  readonly conversationId: string;
  readonly messageId: string;
  readonly attachments: readonly ChatAttachment[];
}

export function MessageAttachments({
  conversationId,
  messageId,
  attachments,
}: MessageAttachmentsProps) {
  if (attachments.length === 0) return null;

  const images = attachments.filter((attachment) => attachment.kind === 'IMAGE');
  const files = attachments.filter((attachment) => attachment.kind === 'FILE');

  return (
    <div className="message-attachments">
      {images.length > 0 && (
        <div
          className="message-attachments__images"
          data-count={Math.min(images.length, 3)}
        >
          {images.map((attachment) => (
            <AttachmentImage
              key={attachment.id}
              conversationId={conversationId}
              messageId={messageId}
              attachment={attachment}
            />
          ))}
        </div>
      )}

      {files.map((attachment) => (
        <AttachmentFile
          key={attachment.id}
          conversationId={conversationId}
          messageId={messageId}
          attachment={attachment}
        />
      ))}
    </div>
  );
}

interface AttachmentProps {
  readonly conversationId: string;
  readonly messageId: string;
  readonly attachment: ChatAttachment;
}

/**
 * Shows an image from a blob URL, which is revoked when the bubble goes: a
 * thread scrolled through for a while would otherwise hold every image it ever
 * rendered.
 */
function AttachmentImage({ conversationId, messageId, attachment }: AttachmentProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoked = false;
    let created: string | null = null;

    fetchChatAttachmentObjectUrl(conversationId, messageId, attachment.id)
      .then((url) => {
        if (revoked) {
          URL.revokeObjectURL(url);
          return;
        }
        created = url;
        setObjectUrl(url);
      })
      .catch(() => setFailed(true));

    return () => {
      revoked = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [conversationId, messageId, attachment.id]);

  if (failed) {
    return (
      <div className="message-attachments__image message-attachments__image--failed">
        <Icon name="broken_image" size={20} />
        <span>Không tải được ảnh</span>
      </div>
    );
  }

  if (!objectUrl) {
    return (
      <div
        className="message-attachments__image message-attachments__image--loading"
        role="status"
        aria-label={`Đang tải ${attachment.originalName}`}
      />
    );
  }

  return (
    <img
      className="message-attachments__image"
      src={objectUrl}
      alt={attachment.originalName}
      loading="lazy"
    />
  );
}

/**
 * A download chip.
 *
 * Fetched on click rather than linked to, since the endpoint needs a bearer
 * token; the blob URL is revoked as soon as the download has started.
 */
function AttachmentFile({ conversationId, messageId, attachment }: AttachmentProps) {
  const [downloading, setDownloading] = useState(false);
  const [failed, setFailed] = useState(false);

  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    setFailed(false);
    try {
      const url = await fetchChatAttachmentObjectUrl(conversationId, messageId, attachment.id);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.originalName;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setFailed(true);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      type="button"
      className="message-attachments__file"
      onClick={download}
      disabled={downloading}
      aria-label={`Tải ${attachment.originalName}`}
    >
      <Icon name={failed ? 'error_outline' : 'description'} size={20} />
      <span className="message-attachments__file-text">
        <span className="message-attachments__file-name">{attachment.originalName}</span>
        <span className="message-attachments__file-meta">
          {failed ? 'Không tải được, bấm để thử lại' : formatBytes(attachment.byteSize)}
        </span>
      </span>
      <Icon name={downloading ? 'hourglass_empty' : 'download'} size={18} />
    </button>
  );
}
