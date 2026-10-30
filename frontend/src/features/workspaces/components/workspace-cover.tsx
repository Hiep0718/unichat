/**
 * The picture a group is seen by — a fill layer, not a band.
 *
 * It covers its whole container so the card's text sits on top of it rather
 * than beside it. A group that uploaded a cover gets it; every other group gets
 * one of the bundled defaults, chosen so no two groups on a page share one
 * (see {@link ../cover-assignment}). That is a default and not a placeholder:
 * cards have to look distinct before anyone uploads anything, and in practice
 * most groups never will.
 *
 * The gradient from {@link ../group-theme} stays underneath either picture. It
 * paints instantly, with no request, so a card is never a grey rectangle for a
 * frame, and it is what remains if the file cannot be fetched at all.
 *
 * The cover endpoint needs a bearer token, which an `<img src>` pointing at the
 * API cannot send, so an uploaded picture is fetched as a blob and shown from
 * an object URL — the same approach as profile pictures. A default is a static
 * file, so it is simply its own URL.
 */
import { useEffect, useState } from 'react';

import { loadCover } from './workspace-cover-cache';
import { useAssignedCover } from '../cover-assignment-context';
import { coverBackground, coverMesh, groupThemeFor } from '../group-theme';
import './workspace-cover.css';

interface WorkspaceCoverProps {
  readonly workspaceId: string;
  readonly name: string;
  /** Whether a picture was uploaded; skips the request when false. */
  readonly hasCover: boolean;
  /** What the group is about, which decides the default picture when set. */
  readonly topics?: readonly string[] | undefined;
}

export function WorkspaceCover({ workspaceId, name, hasCover, topics }: WorkspaceCoverProps) {
  // The id is kept beside the URL rather than reset in the effect: a card
  // component reused for a different group would otherwise show the previous
  // group's picture for a frame.
  const [loaded, setLoaded] = useState<{ id: string; url: string } | null>(null);
  // Set when even the bundled default cannot be fetched — an offline tab, or a
  // deployment serving the app without its static files.
  const [broken, setBroken] = useState(false);
  const { src: defaultCover } = useAssignedCover(workspaceId, topics);

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

  const uploaded = hasCover && loaded?.id === workspaceId ? loaded.url : null;
  const theme = groupThemeFor(workspaceId);

  return (
    <div className="workspace-cover" style={{ background: coverBackground(theme) }}>
      {/* Overlapping blobs of a second and third hue, which is what gives the
          layer depth while it is the only thing on screen. */}
      <span className="workspace-cover__glow" style={{ background: coverMesh(theme) }} />

      {broken ? (
        /* Nothing fetched: the initial becomes the texture the picture would
           have been, as it was before the defaults existed. */
        <span className="workspace-cover__mark" aria-hidden="true">
          {name.trim().charAt(0).toUpperCase()}
        </span>
      ) : (
        <img
          className="workspace-cover__image"
          src={uploaded ?? defaultCover}
          onError={() => setBroken(true)}
          alt=""
        />
      )}

      {/* Darkens the lower half, where every card writes its name and counts in
          white. Without it legibility would depend on which picture a group
          happens to have, and on what a member uploads. */}
      <span className="workspace-cover__scrim" />
    </div>
  );
}
