/**
 * Footer component for public (unauthenticated) pages.
 */

import { Icon } from './icon';
import './footer.css';

/**
 * Renders the site-wide footer with branding and legal links.
 */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <div className="site-footer__logo">
            <Icon name="school" filled size={16} />
            UniChat
          </div>
          <p className="site-footer__copyright">
            © 2024 UniChat - Hệ thống học tập thông minh RAG.
          </p>
        </div>

        <nav className="site-footer__links">
          <a href="#about" className="site-footer__link">Về chúng tôi</a>
          <a href="#terms" className="site-footer__link">Điều khoản</a>
          <a href="#privacy" className="site-footer__link">Bảo mật</a>
          <a href="#contact" className="site-footer__link">Liên hệ</a>
        </nav>
      </div>
    </footer>
  );
}
