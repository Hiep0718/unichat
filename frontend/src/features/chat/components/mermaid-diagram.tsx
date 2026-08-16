import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';

/** Unique ID counter for mermaid diagram instances */
let mermaidCounter = 0;

/**
 * Initialize mermaid with a sleek dark-aware theme.
 * Called once on module load.
 */
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    primaryColor: '#0284c7',
    primaryTextColor: '#f8fafc',
    primaryBorderColor: '#0369a1',
    lineColor: '#64748b',
    secondaryColor: '#7c3aed',
    tertiaryColor: '#f0f9ff',
    fontSize: '14px',
    fontFamily: '"Inter Variable", "Be Vietnam Pro", system-ui, sans-serif',
    nodeBorder: '#0284c7',
    mainBkg: '#e0f2fe',
    clusterBkg: '#f0f9ff',
    titleColor: '#0f172a',
  },
  mindmap: {
    useMaxWidth: true,
    padding: 16,
  },
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis',
    padding: 16,
  },
  sequence: {
    useMaxWidth: true,
  },
});

interface MermaidDiagramProps {
  /** Raw mermaid syntax string */
  chart: string;
}

/**
 * Renders a Mermaid diagram from its textual syntax.
 * Features: auto-render, zoom, fullscreen toggle, error fallback.
 */
export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const idRef = useRef(`mermaid-diagram-${++mermaidCounter}`);

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      try {
        const trimmed = chart.trim();
        if (!trimmed) return;

        const { svg } = await mermaid.render(idRef.current, trimmed);
        if (!cancelled) {
          setSvgHtml(svg);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setError(message);
          setSvgHtml('');
        }
      }
    };

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [chart]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
    setZoom(1);
  }, []);

  if (error) {
    return (
      <div className="mermaid-error">
        <div className="mermaid-error__header">
          <span className="material-symbols-outlined">warning</span>
          <span>Không thể hiển thị sơ đồ</span>
        </div>
        <pre className="mermaid-error__code">{chart}</pre>
      </div>
    );
  }

  if (!svgHtml) {
    return (
      <div className="mermaid-loading">
        <div className="mermaid-loading__spinner" />
        <span>Đang tạo sơ đồ…</span>
      </div>
    );
  }

  return (
    <>
      <div
        className={`mermaid-container ${isFullscreen ? 'mermaid-container--fullscreen' : ''}`}
        ref={containerRef}
      >
        <div className="mermaid-toolbar">
          <div className="mermaid-toolbar__label">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              schema
            </span>
            <span>Sơ đồ trực quan</span>
          </div>
          <div className="mermaid-toolbar__actions">
            <button
              type="button"
              className="mermaid-toolbar__btn"
              onClick={handleZoomOut}
              title="Thu nhỏ"
              aria-label="Thu nhỏ sơ đồ"
            >
              <span className="material-symbols-outlined">remove</span>
            </button>
            <button
              type="button"
              className="mermaid-toolbar__btn mermaid-toolbar__btn--zoom-label"
              onClick={handleResetZoom}
              title="Đặt lại zoom"
              aria-label="Đặt lại zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              className="mermaid-toolbar__btn"
              onClick={handleZoomIn}
              title="Phóng to"
              aria-label="Phóng to sơ đồ"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
            <div className="mermaid-toolbar__divider" />
            <button
              type="button"
              className="mermaid-toolbar__btn"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Thu gọn' : 'Xem toàn màn hình'}
              aria-label={isFullscreen ? 'Thu gọn sơ đồ' : 'Xem sơ đồ toàn màn hình'}
            >
              <span className="material-symbols-outlined">
                {isFullscreen ? 'close_fullscreen' : 'open_in_full'}
              </span>
            </button>
          </div>
        </div>

        <div
          className="mermaid-viewport"
          style={{ overflow: 'auto' }}
        >
          <div
            className="mermaid-svg-wrapper"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        </div>
      </div>

      {isFullscreen && (
        <div
          className="mermaid-fullscreen-overlay"
          onClick={toggleFullscreen}
          role="button"
          tabIndex={-1}
          aria-label="Đóng chế độ toàn màn hình"
        />
      )}
    </>
  );
};
