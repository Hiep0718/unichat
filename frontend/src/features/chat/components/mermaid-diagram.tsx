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
 * 1. Missing diagram type declaration (auto-detect flowchart vs mindmap vs classDiagram)
 * 2. Strip non-mermaid header/comment lines (e.g. "3. Sơ đồ...")
 * 3. Strip citation markers [1], [2], [1, 2], [1][2], etc.
 * 4. Quote node labels with special characters for mindmap
 */
function sanitizeMermaidCode(raw: string): string {
  let code = raw.trim();

  // Strip code block markers if present
  code = code
    .replace(/^```mermaid\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/```$/, '')
    .trim();

  // Strip citation markers like [1], [2], [1, 2], [1][2], [citation 1] everywhere
  code = code.replace(/\[\d+(?:\s*,\s*\d+)*\]/g, '');
  code = code.replace(/\[\s*\d+\s*\]/g, '');
  code = code.replace(/\[citation:\s*\d+\]/gi, '');

  // Strip non-mermaid title text lines at top (e.g. "3. Sơ đồ minh họa...")
  const lines = code.split('\n');
  const firstDiagramIdx = lines.findIndex((line) => {
    const trimmed = line.trim().toLowerCase();
    if (!trimmed) return false;
    return (
      DIAGRAM_KEYWORDS.some((kw) => trimmed.startsWith(kw.toLowerCase())) ||
      /^\w+\s*[-=]+>?\s*\w+/.test(trimmed) ||
      /^class\s+\w+/.test(trimmed) ||
      /^root\s*\(\(/.test(trimmed)
    );
  });

  if (firstDiagramIdx > 0) {
    code = lines.slice(firstDiagramIdx).join('\n').trim();
  }

  // Prepend mindmap if root(( is found
  if (/root\s*\(\(/.test(code) && !code.toLowerCase().startsWith('mindmap')) {
    code = `mindmap\n${code}`;
  }

  // Detect UML class diagram
  if (/^class\s+\w+/m.test(code) && !code.startsWith('classDiagram')) {
    code = `classDiagram\n${code}`;
  }

  // If no diagram declaration found, auto-detect type
  if (!hasDiagramDeclaration(code)) {
    if (/\w+\s*[-=]+>?\s*\w+/.test(code)) {
      code = `flowchart TD\n${code}`;
    } else if (/root\s*\(\(/.test(code) || /^\s{2,}\w+/m.test(code)) {
      code = `mindmap\n${code}`;
    } else {
      code = `flowchart TD\n${code}`;
    }
  }

  // For mindmap diagrams: sanitize and quote ALL node labels properly
  if (code.toLowerCase().startsWith('mindmap')) {
    code = code
      .split('\n')
      .map((line) => {
        const match = line.match(/^(\s*)(.+)$/);
        if (!match) return line;
        const indent = match[1] ?? '';
        let label = (match[2] ?? '').trim();

        if (
          !label ||
          label.toLowerCase().startsWith('mindmap') ||
          label.startsWith('%%')
        ) {
          return line;
        }

        // Handle root node like root((Title))
        if (label.startsWith('root((') && label.endsWith('))')) {
          const inner = label.slice(6, -2).trim().replace(/"/g, "'");
          return `${indent}root(("${inner}"))`;
        }

        // Strip unclosed brackets or convert to parens
        label = label.replace(/\[\d+\]/g, '').replace(/\[/g, '(').replace(/\]/g, ')').trim();

        // If label is wrapped in quotes, unwrap first
        if (label.startsWith('"') && label.endsWith('"')) {
          label = label.slice(1, -1);
        }

        // Clean label: escape inner quotes into single quotes
        label = label.replace(/"/g, "'");

        return `${indent}"${label}"`;
      })
      .join('\n');
  }

  return code;
}

interface MermaidDiagramProps {
  /** Raw mermaid syntax string */
  chart: string;
  isStreaming?: boolean | undefined;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, isStreaming }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const idRef = useRef(`mermaid-diagram-${++mermaidCounter}`);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const trimmed = chart.trim();
        if (!trimmed) {
          if (!isStreaming && !cancelled) {
            setError('Nội dung sơ đồ rỗng');
          }
          return;
        }

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
          if (!isStreaming) {
            setError(message);
          }
        }
      }
    }, isStreaming ? 120 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [chart, isStreaming]);

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

    const clone = svgEl.cloneNode(true) as SVGElement;
    if (!clone.getAttribute('xmlns')) {
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    const bbox = svgEl.getBoundingClientRect();
    const width = Math.max(bbox.width || 800, 400);
    const height = Math.max(bbox.height || 600, 300);

    clone.setAttribute('width', `${width}`);
    clone.setAttribute('height', `${height}`);

    const svgString = new XMLSerializer().serializeToString(clone);
    const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = 2; // Crisp 2x HD rendering
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);

      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `so-do-unichat-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.onerror = (err) => {
      console.error('Lỗi khi tải ảnh PNG sơ đồ:', err);
    };
    img.src = svgDataUrl;
  }, []);

  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = useCallback(() => {
    const sanitized = sanitizeMermaidCode(chart);
    navigator.clipboard.writeText(sanitized);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }, [chart]);
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

  if (error && !isStreaming) {
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
        <span>Đang loading...</span>
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
            <button
              type="button"
              className={`mermaid-toolbar__btn mermaid-toolbar__btn--action ${copiedCode ? 'mermaid-toolbar__btn--copied' : ''}`}
              onClick={handleCopyCode}
              title="Sao chép mã sơ đồ Mermaid"
              aria-label="Sao chép mã sơ đồ Mermaid"
            >
              <span className="material-symbols-outlined">{copiedCode ? 'check' : 'content_copy'}</span>
              <span className="mermaid-toolbar__btn-text">{copiedCode ? 'Đã sao chép' : 'Sao chép'}</span>
            </button>
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
