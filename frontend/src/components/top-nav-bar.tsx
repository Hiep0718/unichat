/**
 * Top navigation bar for public (unauthenticated) pages.
 * Displays logo, navigation links, and auth action buttons.
 */

import { Link } from 'react-router-dom';

import { Icon } from './icon';
import './top-nav-bar.css';

/**
 * Renders the fixed top navigation bar used on public pages.
 */
export function TopNavBar() {
  return (
    <header className="top-nav">
      <div className="top-nav__inner">
        <Link to="/" className="top-nav__logo">
          <Icon name="school" filled size={20} />
          UniChat
        </Link>

        <nav className="top-nav__links">
          <a href="#features" className="top-nav__link">Tính năng</a>
          <a href="#how-it-works" className="top-nav__link">Cách hoạt động</a>
          <a href="#demo" className="top-nav__link">Demo</a>
          {/* Mục "Tài liệu" đã bỏ: nó trỏ tới #docs, mà không có phần nào
              trên trang mang id đó và cũng không có trang tài liệu nào trong
              router. Một mục điều hướng bấm vào không xảy ra gì thì tệ hơn là
              một mục ít hơn. Đưa lại ngay khi có trang để trỏ tới. */}
        </nav>

        <div className="top-nav__actions">
          <Link to="/login" className="top-nav__signin">Đăng nhập</Link>
          <Link to="/register" className="top-nav__signup-btn">Đăng ký</Link>
        </div>
      </div>
    </header>
  );
}
