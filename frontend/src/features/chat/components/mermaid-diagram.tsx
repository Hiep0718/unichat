import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';

/** Unique ID counter for mermaid diagram instances */
let mermaidCounter = 0;

/**
 * Initialize mermaid with a sleek theme.
 * Called once on module load.
 */
mermaid.initialize({
  startOnLoad: false,
  suppressErrorRendering: true,
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

/** Known mermaid diagram type keywords */
const DIAGRAM_KEYWORDS = [
  'mindmap', 'flowchart', 'graph', 'sequenceDiagram',
  'classDiagram', 'stateDiagram', 'erDiagram', 'gantt',
  'pie', 'gitgraph', 'journey', 'quadrantChart',
  'xychart-beta', 'block-beta', 'sankey-beta',
];

/**
 * Check if the code starts with a known mermaid diagram declaration.
 */
function hasDiagramDeclaration(code: string): boolean {
  const firstLine = code.split('\n')[0]?.trim() ?? '';
  return DIAGRAM_KEYWORDS.some((kw) => firstLine.startsWith(kw));
}

/**
 * Detect and fix common mermaid syntax issues:
 * 1. Missing diagram type declaration (auto-detect flowchart vs mindmap)
 * 2. Strip citation markers [1], [2]
 * 3. Quote node labels with special characters for mindmap
 */
function sanitizeMermaidCode(raw: string): string {
  let code = raw.trim();

  // Strip citation markers like [1], [2], [1][4] everywhere
  code = code.replace(/\s*\[\d+\]/g, '');

  // If no diagram declaration found, auto-detect type
  if (!hasDiagramDeclaration(code)) {
    // Detect flowchart pattern: "A --> B" or "A --- B" or "A ==> B"
    if (/\w+\s*[-=]+>?\s*\w+/.test(code)) {
      code = `flowchart TD\n${code}`;
    }
    // Detect mindmap pattern: indented lines with root((...))
    else if (/root\s*\(\(/.test(code)) {
      code = `mindmap\n${code}`;
    }
    // Default to flowchart
    else {
      code = `flowchart TD\n${code}`;
    }
  }

  // For mindmap diagrams: quote labels with special characters
  if (code.startsWith('mindmap')) {
    code = code
      .split('\n')
      .map((line) => {
        const match = line.match(/^(\s+)(.+)$/);
        if (!match) return line;
        const indent = match[1] ?? '';
        const label = (match[2] ?? '').trim();
        // Skip keyword lines, root lines, or already quoted
        if (
          !label ||
          label.startsWith('root') ||
          label.startsWith('%%') ||
          label.startsWith('mindmap') ||
          label.startsWith('"')
        ) {
          return line;
        }
        // If label has special chars, wrap in double quotes
        if (/[:\-–—(){}|<>#&@$%^*+=!?/\\;,.]/.test(label)) {
          return `${indent}"${label.replace(/"/g, "'")}"`;
        }
        return line;
      })
      .join('\n');
  }

  return code;
}

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

        const sanitized = sanitizeMermaidCode(trimmed);

        // Use a unique ID per render attempt to avoid stale DOM nodes
        const renderId = `${idRef.current}-${Date.now()}`;
        const { svg } = await mermaid.render(renderId, sanitized);

        // Clean up any orphaned render containers mermaid leaves behind
        const orphan = document.getElementById(`d${renderId}`);
        if (orphan) orphan.remove();

        if (!cancelled) {
          setSvgHtml(svg);
          setError(null);
        }
      } catch (err: unknown) {
        // Clean up any error elements mermaid inserts into the DOM
        document.querySelectorAll('[id^="dmermaid-diagram-"]').forEach((el) => el.remove());

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
