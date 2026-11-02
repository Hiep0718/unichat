import { isValidElement } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { MermaidDiagram } from './mermaid-diagram';
import type { CitationItem } from '../chat-api';
import 'katex/dist/katex.min.css';

interface ChatMarkdownProps {
  readonly content: string;
  readonly provisional?: boolean;
  readonly citations?: readonly CitationItem[] | undefined;
  readonly onSelectCitation?: ((citation: CitationItem) => void) | undefined;
}

/** Renders escaped Markdown/math while turning citations into interactive badges and denying unsafe URLs. */
export function ChatMarkdown({ content, provisional = false, citations, onSelectCitation }: ChatMarkdownProps) {
  // Convert standalone bracket markers [1], [2] to relative anchor links [[1]](#citation-1)
  const processedContent = content.replace(/(?<!\[)\[(\d+)\](?!\()/g, '[[$1]](#citation-$1)');

  return <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { trust: false, strict: 'error' }]]}
    skipHtml components={{
      img: ({ alt }) => <span>{alt ? `[Hình ảnh: ${alt}]` : '[Hình ảnh]'}</span>,
      a: ({ href, children }) => {
        if (href?.startsWith('#citation-')) {
          const citationId = href.replace('#citation-', '');
          const citation = citations?.find(
            (c, idx) => c.citationId === citationId || String(idx + 1) === citationId
          );
          return <button
            type="button"
            className="chat-citation-badge"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (citation && onSelectCitation) {
                onSelectCitation(citation);
              }
            }}
            title={citation ? `${citation.fileName || 'Tài liệu'} (${citation.locator || 'Đoạn trích'})` : `Nguồn trích dẫn [${citationId}]`}
          >
            {children}
          </button>;
        }
        return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
      },
      pre: ({ children }) => isValidElement<{ className?: string }>(children)
        && children.props.className === 'language-mermaid' ? <>{children}</> : <pre>{children}</pre>,
      code: ({ className, children }) => className === 'language-mermaid'
        ? <MermaidDiagram chart={String(children)} isStreaming={provisional} />
        : <code className={className}>{children}</code>,
    }}>
    {processedContent}
  </Markdown>;
}
