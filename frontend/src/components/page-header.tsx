import type { ReactNode } from 'react';

import './page-header.css';

interface PageHeaderProps {
  readonly title: string;
  /** One sentence on what the page is for. */
  readonly subtitle?: string;
  /** Primary and secondary actions, drawn on the right. */
  readonly actions?: ReactNode;
  /** Lets a page align the header with its own content column. */
  readonly className?: string;
}

/**
 * The title band shared by the top-level pages (Bảng tin, Tin nhắn, Tài khoản).
 *
 * Before this each page drew its own: the feed had no title at all, Tin nhắn
 * put a 20px heading inside its conversation panel, and the account page used
 * a 24px heading with a lede. One component keeps the size, spacing and
 * action placement identical, so moving between tabs reads as one product.
 */
export function PageHeader({ title, subtitle, actions, className = '' }: PageHeaderProps) {
  return (
    <header className={`page-header ${className}`.trim()}>
      <div className="page-header__text">
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}
