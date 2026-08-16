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
    primaryColor: '#dbeafe',
    primaryTextColor: '#0f172a',
    primaryBorderColor: '#93c5fd',
    lineColor: '#94a3b8',
    secondaryColor: '#ede9fe',
    secondaryTextColor: '#1e1b4b',
    secondaryBorderColor: '#c4b5fd',
    tertiaryColor: '#ecfdf5',
    tertiaryTextColor: '#064e3b',
    tertiaryBorderColor: '#6ee7b7',
    fontSize: '15px',
    fontFamily: '"Inter Variable", "Be Vietnam Pro", system-ui, sans-serif',
    nodeBorder: '#93c5fd',
    mainBkg: '#dbeafe',
    clusterBkg: '#f0f9ff',
    titleColor: '#0f172a',
    edgeLabelBackground: '#ffffff',
    nodeTextColor: '#0f172a',
  },
  mindmap: {
    useMaxWidth: false,
    padding: 20,
  },
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
    curve: 'basis',
    padding: 24,
    nodeSpacing: 36,
    rankSpacing: 54,
    defaultRenderer: 'dagre-wrapper',
  },
  sequence: {
    useMaxWidth: false,
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

  const handleDownloadSvg = useCallback(() => {
    if (!svgHtml) return;
    const blob = new Blob([svgHtml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `so-do-unichat-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [svgHtml]);

  const handleDownloadPng = useCallback(() => {
    if (!containerRef.current) return;
    const svgEl = containerRef.current.querySelector('svg');
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const bbox = svgEl.getBoundingClientRect();
      const scale = 2; // High resolution 2x
      const width = Math.max(bbox.width || 800, 400) * scale;
      const height = Math.max(bbox.height || 600, 300) * scale;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Crisp background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `so-do-unichat-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.src = url;
  }, []);
  const viewportRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const isRightClickDragRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const scrollPosRef = useRef({ left: 0, top: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.button !== 2) return;
    if (!viewportRef.current) return;

    isDraggingRef.current = true;
    isRightClickDragRef.current = (e.button === 2);
    setIsDragging(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    scrollPosRef.current = {
      left: viewportRef.current.scrollLeft,
      top: viewportRef.current.scrollTop,
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !viewportRef.current) return;

    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;

    viewportRef.current.scrollLeft = scrollPosRef.current.left - dx;
    viewportRef.current.scrollTop = scrollPosRef.current.top - dy;
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent native context menu if user performed right-click drag pan
    if (isRightClickDragRef.current) {
      e.preventDefault();
      isRightClickDragRef.current = false;
    }
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
              className="mermaid-toolbar__btn mermaid-toolbar__btn--download"
              onClick={handleDownloadPng}
              title="Tải về định dạng PNG"
              aria-label="Tải về hình ảnh PNG"
            >
              <span className="material-symbols-outlined">image</span>
              <span className="mermaid-toolbar__btn-text">PNG</span>
            </button>
            <button
              type="button"
              className="mermaid-toolbar__btn mermaid-toolbar__btn--download"
              onClick={handleDownloadSvg}
              title="Tải về định dạng SVG (Vector)"
              aria-label="Tải về file vector SVG"
            >
              <span className="material-symbols-outlined">download</span>
              <span className="mermaid-toolbar__btn-text">SVG</span>
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
          ref={viewportRef}
          className={`mermaid-viewport ${isDragging ? 'mermaid-viewport--dragging' : ''}`}
          style={{ overflow: 'auto' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={handleContextMenu}
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
