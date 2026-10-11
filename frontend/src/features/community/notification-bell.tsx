import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

import { Icon } from '../../components/icon';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationResponse,
} from './community-api';
import './notification-bell.css';

export interface NotificationBellProps {
  /** Callback notified whenever the notification dropdown opens or closes. */
  readonly onOpenChange?: (open: boolean) => void;
}

/**
 * Notification bell with unread badge, text label, and portal dropdown.
 * Polls for unread count every 30 seconds.
 */
export const NotificationBell: React.FC<NotificationBellProps> = ({ onOpenChange }) => {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<React.CSSProperties>({
    position: 'fixed',
    left: '272px',
    bottom: '16px',
    zIndex: 1000,
  });

  const handleClose = useCallback(() => {
    setOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  const handleToggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      onOpenChange?.(next);
      return next;
    });
  }, [onOpenChange]);

  // Poll unread count
  useEffect(() => {
    const loadCount = () => {
      fetchUnreadCount()
        .then((data) => setUnreadCount(data.unreadCount))
        .catch(() => { /* silently fail */ });
    };
    loadCount();
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (!open) return;
    fetchNotifications(20)
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, [open]);

  // Update dropdown position relative to the bell button
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const left = Math.max(rect.right + 12, 80);
      const bottom = Math.max(16, window.innerHeight - rect.bottom);
      setDropdownPos({
        position: 'fixed',
        left: `${left}px`,
        bottom: `${bottom}px`,
        zIndex: 1000,
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [open]);

  // Close on outside click and Escape key
  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        handleClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleClose]);

  const handleMarkRead = useCallback(async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  return (
    <div className="notification-bell">
      <button
        ref={buttonRef}
        type="button"
        className={`side-nav__item side-nav__btn ${open ? 'side-nav__item--active' : ''}`}
        onClick={handleToggle}
        title="Thông báo"
        aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ''}`}
        aria-expanded={open}
      >
        <span className="side-nav__icon-wrap">
          <Icon name="notifications" size={20} />
          {unreadCount > 0 && (
            <span className="notification-bell__badge">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
        <span className="side-nav__label">Thông báo</span>
      </button>

      {open &&
        createPortal(
          <div
            className="notification-dropdown"
            ref={dropdownRef}
            style={dropdownPos}
            role="region"
            aria-label="Danh sách thông báo"
          >
            <div className="notification-dropdown__header">
              <span className="notification-dropdown__title">Thông báo</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="notification-dropdown__mark-all"
                  onClick={handleMarkAllRead}
                >
                  Đánh dấu tất cả đã đọc
                </button>
              )}
            </div>
            <div className="notification-dropdown__list">
              {notifications.length === 0 ? (
                <div className="notification-dropdown__empty">
                  Chưa có thông báo nào
                </div>
              ) : (
                notifications.map((n) => {
                  const iconInfo = getNotificationIcon(n.type);
                  return (
                    <div
                      key={n.id}
                      className={`notification-item ${!n.isRead ? 'notification-item--unread' : ''}`}
                      onClick={() => !n.isRead && handleMarkRead(n.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          if (!n.isRead) handleMarkRead(n.id);
                        }
                      }}
                    >
                      <div className={`notification-item__icon ${iconInfo.className}`}>
                        <Icon name={iconInfo.name} size={18} />
                      </div>
                      <div className="notification-item__body">
                        <p className="notification-item__text">{getNotificationText(n)}</p>
                        <p className="notification-item__time">{formatTimeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

function getNotificationIcon(type: string) {
  switch (type) {
    case 'DISCUSSION_REPLY': return { name: 'reply', className: 'notification-item__icon--reply' };
    case 'AI_MENTION_REPLY': return { name: 'smart_toy', className: 'notification-item__icon--ai' };
    case 'DOCUMENT_APPROVED': return { name: 'check_circle', className: 'notification-item__icon--approval' };
    case 'DOCUMENT_REJECTED': return { name: 'cancel', className: 'notification-item__icon--approval' };
    case 'COMMUNITY_MENTION': return { name: 'alternate_email', className: 'notification-item__icon--mention' };
    case 'MENTION': return { name: 'alternate_email', className: 'notification-item__icon--mention' };
    default: return { name: 'notifications', className: 'notification-item__icon--reply' };
  }
}

function getNotificationText(n: NotificationResponse): string {
  switch (n.type) {
    case 'DISCUSSION_REPLY': return 'Có người trả lời bài thảo luận của bạn';
    case 'AI_MENTION_REPLY': return 'AI đã trả lời câu hỏi của bạn';
    case 'DOCUMENT_APPROVED': return 'Tài liệu của bạn đã được duyệt';
    case 'DOCUMENT_REJECTED': return 'Tài liệu của bạn đã bị từ chối';
    case 'JOIN_APPROVED': return 'Yêu cầu tham gia đã được chấp nhận';
    case 'COMMUNITY_MENTION': return 'Bạn được nhắc đến trong chat';
    case 'MENTION': return 'Bạn được nhắc tên trong một bài viết';
    default: return 'Bạn có thông báo mới';
  }
}

function formatTimeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  } catch { return ''; }
}
