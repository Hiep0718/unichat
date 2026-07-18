/**
 * Side navigation bar for authenticated pages.
 * Displays logo, upload CTA, navigation items, and admin link.
 */

import { Link, useLocation } from 'react-router-dom';

import { Icon } from './icon';
import logoWhite from '../assets/logo-white.png';
import './side-nav-bar.css';

interface NavItem {
  readonly icon: string;
  readonly label: string;
  readonly href: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { icon: 'dashboard', label: 'Tổng quan', href: '/' },
  { icon: 'workspaces', label: 'Không gian làm việc', href: '/workspaces' },
  { icon: 'description', label: 'Tài liệu', href: '/documents' },
  { icon: 'chat', label: 'Trò chuyện', href: '/chat' },
  { icon: 'history', label: 'Lịch sử', href: '/history' },
  { icon: 'person', label: 'Tài khoản', href: '/account' },
];

/**
 * Renders the fixed left sidebar navigation used on authenticated pages.
 */
export function SideNavBar() {
  const location = useLocation();

  return (
    <nav className="side-nav" aria-label="Thanh điều hướng chính">
      <div className="side-nav__header">
        <div className="side-nav__avatar">
          <img src={logoWhite} alt="UniChat Logo" width="32" height="32" style={{ objectFit: 'contain' }} />
        </div>
        <div>
          <h1 className="side-nav__title">UniChat</h1>
          <p className="side-nav__subtitle">Hệ thống RAG thông minh</p>
        </div>
      </div>

      <button className="side-nav__upload-btn" type="button">
        <Icon name="add" size={20} />
        Tải tài liệu mới
      </button>

      <div className="side-nav__items">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.icon}
            to={item.href}
            className={`side-nav__item ${location.pathname === item.href ? 'side-nav__item--active' : ''}`}
          >
            <Icon name={item.icon} size={20} />
            {item.label}
          </Link>
        ))}
      </div>

      <div className="side-nav__footer">
        <Link to="#" className="side-nav__item">
          <Icon name="admin_panel_settings" size={20} />
          Quản trị viên
        </Link>
      </div>
    </nav>
  );
}
