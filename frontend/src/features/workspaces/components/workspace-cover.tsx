/**
 * The picture a group is seen by — a fill layer, not a band.
 *
 * It covers its whole container so the card's text sits on top of it rather
 * than beside it. A group that uploaded a cover gets it; every other group gets
 * the gradient {@link ../group-theme} assigns it, which is the default rather
 * than a placeholder: cards have to look distinct before anyone uploads
 * anything, and in practice most groups never will.
 *
 * The cover endpoint needs a bearer token, which an `<img src>` pointing at the
 * API cannot send, so the picture is fetched as a blob and shown from an object
 * URL — the same approach as profile pictures.
 */
import { useEffect, useState } from 'react';

import { loadCover } from './workspace-cover-cache';
import { coverBackground, coverMesh, groupThemeFor } from '../group-theme';
import './workspace-cover.css';

interface WorkspaceCoverProps {
  readonly workspaceId: string;
  readonly name: string;
  /** Whether a picture was uploaded; skips the request when false. */
  readonly hasCover: boolean;
}

export function WorkspaceCover({ workspaceId, name, hasCover }: WorkspaceCoverProps) {
  // The id is kept beside the URL rather than reset in the effect: a card
  // component reused for a different group would otherwise show the previous
  // group's picture for a frame.
  const [loaded, setLoaded] = useState<{ id: string; url: string } | null>(null);

  useEffect(() => {
    if (!hasCover) {
      return;
    }
    let cancelled = false;
    loadCover(workspaceId).then((url) => {
      // A failed load leaves the gradient in place rather than a grey gap.
      if (!cancelled && url) setLoaded({ id: workspaceId, url });
    });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, hasCover]);

  const imageUrl = hasCover && loaded?.id === workspaceId ? loaded.url : null;

  if (imageUrl) {
    return (
      <div className="workspace-cover">
        <img className="workspace-cover__image" src={imageUrl} alt="" />
      </div>
    );
  }

  const theme = groupThemeFor(workspaceId);

  return (
    <div className="workspace-cover" style={{ background: coverBackground(theme) }}>
      {/* Overlapping blobs of a second and third hue, which is what gives the
          panel depth rather than reading as one flat sweep. */}
      <span className="workspace-cover__glow" style={{ background: coverMesh(theme) }} />
      {/* The initial is texture here, not a label: the name is written in full
          over the picture, so a large centred glyph would just compete. */}
      <span className="workspace-cover__mark" aria-hidden="true">
        {name.trim().charAt(0).toUpperCase()}
      </span>
    </div>
  );
}
