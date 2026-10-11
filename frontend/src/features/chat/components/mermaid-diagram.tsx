import { useEffect, useId, useState } from 'react';

/** Isolates sanitized Mermaid SVG as an image, preserving escaping at the React boundary. */
export function MermaidDiagram({ chart, isStreaming = false }: { readonly chart: string; readonly isStreaming?: boolean | undefined }) {
  const id = useId().replace(/:/g, '');
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const lifecycle = { cancelled: false, url: null as string | null };
    if (isStreaming || chart.length > 30_000) return;
    void renderDiagram(id, chart).then((svg) => {
      if (lifecycle.cancelled) return;
      lifecycle.url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      setImage(lifecycle.url); setError(null);
    }).catch(() => { if (!lifecycle.cancelled) setError('Không thể hiển thị sơ đồ. Bạn có thể đọc mã bên dưới.'); });
    return () => { lifecycle.cancelled = true; if (lifecycle.url) URL.revokeObjectURL(lifecycle.url); };
  }, [id, chart, isStreaming]);
  if (isStreaming) return <pre><code>{chart}</code></pre>;
  if (error) return <div role="status"><p>{error}</p><pre><code>{chart}</code></pre></div>;
  return <figure className="mermaid-container">{image ? <><img src={image} alt="Sơ đồ từ câu trả lời AI" />
    <a href={image} download="so-do-unichat.svg">Tải SVG</a></> : <p>Đang dựng sơ đồ…</p>}</figure>;
}

async function renderDiagram(id: string, chart: string): Promise<string> {
  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', suppressErrorRendering: true,
    maxTextSize: 30_000, flowchart: { htmlLabels: false }, theme: 'neutral' });
  const source = chart.replace(/%%\{[\s\S]*?\}%%/g, '').replace(/^\s*click\s.*$/gm, '');
  const result = await mermaid.render(`unichat-${id}-${crypto.randomUUID()}`, source);
  return result.svg;
}
