import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { MermaidDiagram } from './mermaid-diagram';
import 'katex/dist/katex.min.css';

/** Renders escaped Markdown/math while denying embedded remote images and unsafe URLs. */
export function ChatMarkdown({ content, provisional = false }: { readonly content: string; readonly provisional?: boolean }) {
  return <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { trust: false, strict: 'error' }]]}
    skipHtml components={{
      img: ({ alt }) => <span>{alt ? `[Hình ảnh: ${alt}]` : '[Hình ảnh]'}</span>,
      a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
      code: ({ className, children }) => className === 'language-mermaid'
        ? <MermaidDiagram chart={String(children)} isStreaming={provisional} />
        : <code className={className}>{children}</code>,
    }}>
    {content}
  </Markdown>;
}
