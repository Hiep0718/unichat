/**
 * Attachments shown under a post.
 *
 * Images render inline. Documents render as chips that say whether the group's
 * AI assistant can already cite the file or whether it is still waiting for
 * approval — the distinction a reader actually cares about.
 */
import { useEffect, useState } from 'react';

import { Icon } from '../../../components/icon';
import { AttachmentSummary } from './attachment-summary';
import { fetchAttachmentObjectUrl } from '../community-api';
import type { PostAttachment } from '../community-api';
import './post-attachments.css';

interface PostAttachmentsProps {
  readonly workspaceId: string;
  readonly discussionId: string;
  readonly attachments: readonly PostAttachment[];
  /** Compact single-image preview used on feed cards. */
  readonly preview?: boolean;
}

/** Human-readable file size. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PostAttachments({
  workspaceId,
  discussionId,
  attachments,
  preview = false,
}: PostAttachmentsProps) {
  if (attachments.length === 0) return null;

  const images = attachments.filter((a) => a.kind === 'IMAGE');
  const documents = attachments.filter((a) => a.kind === 'DOCUMENT');

  if (preview) {
    const first = images[0];
    if (!first) return null;
    return (
      <div className="post-attachments__preview">
        <AttachmentImage
          workspaceId={workspaceId}
          discussionId={discussionId}
          attachment={first}
        />
        {images.length > 1 && (
          <span className="post-attachments__more">+{images.length - 1}</span>
        )}
      </div>
    );
  }

  return (
    <div className="post-attachments">
      {images.length > 0 && (
        <div
          className={`post-attachments__grid ${images.length > 1 ? 'post-attachments__grid--multi' : ''}`}
        >
          {images.map((image) => (
            <AttachmentImage
              key={image.id}
              workspaceId={workspaceId}
              discussionId={discussionId}
              attachment={image}
            />
          ))}
        </div>
      )}

      {documents.length > 0 && (
        <ul className="post-attachments__files">
          {documents.map((doc) => (
            <li key={doc.id} className="post-attachments__file">
              <div className="post-attachments__file-row">
                <Icon name="description" size={20} />
                <span className="post-attachments__file-meta">
                  <span className="post-attachments__file-name">{doc.originalName}</span>
                  <span className="post-attachments__file-sub">
                    {formatBytes(doc.byteSize)}
                    {' · '}
                    {doc.documentId ? (
                      <span className="post-attachments__ready">
                        <Icon name="auto_awesome" size={13} /> Trợ lý AI đọc được
                      </span>
                    ) : (
                      'Chỉ tải xuống'
                    )}
                  </span>
                </span>
              </div>
              <AttachmentSummary attachment={doc} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface AttachmentImageProps {
  readonly workspaceId: string;
  readonly discussionId: string;
  readonly attachment: PostAttachment;
}

/**
 * Loads an image through an authorised request and shows it from a blob URL,
 * since the content endpoint needs a bearer token that `<img src>` cannot send.
 */
function AttachmentImage({ workspaceId, discussionId, attachment }: AttachmentImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoked = false;
    let created: string | null = null;

    fetchAttachmentObjectUrl(workspaceId, discussionId, attachment.id)
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
  }, [workspaceId, discussionId, attachment.id]);

  if (failed) {
    return (
      <div className="post-attachments__image post-attachments__image--failed">
        <Icon name="broken_image" size={22} />
        <span>Không tải được ảnh</span>
      </div>
    );
  }

  if (!objectUrl) {
    return <div className="post-attachments__image post-attachments__image--loading" />;
  }

  return (
    <img
      className="post-attachments__image"
      src={objectUrl}
      alt={attachment.originalName}
      loading="lazy"
    />
  );
}
