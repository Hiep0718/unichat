import React, { useState, useEffect, useRef, useCallback } from 'react';

import { Icon } from '../../components/icon';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationResponse,
} from './community-api';
import './notification-bell.css';

/**
 * Notification bell with unread badge and dropdown.
 * Polls for unread count every 30 seconds.
 */
export const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'DISCUSSION_REPLY': return { name: 'reply', className: 'notification-item__icon--reply' };
      case 'AI_MENTION_REPLY': return { name: 'smart_toy', className: 'notification-item__icon--ai' };
      case 'DOCUMENT_APPROVED': return { name: 'check_circle', className: 'notification-item__icon--approval' };
      case 'DOCUMENT_REJECTED': return { name: 'cancel', className: 'notification-item__icon--approval' };
      case 'COMMUNITY_MENTION': return { name: 'alternate_email', className: 'notification-item__icon--mention' };
      default: return { name: 'notifications', className: 'notification-item__icon--reply' };
    }
  };

  const getNotificationText = (n: NotificationResponse) => {
    switch (n.type) {
      case 'DISCUSSION_REPLY': return 'Có người trả lời bài thảo luận của bạn';
      case 'AI_MENTION_REPLY': return 'AI đã trả lời câu hỏi của bạn';
      case 'DOCUMENT_APPROVED': return 'Tài liệu của bạn đã được duyệt';
      case 'DOCUMENT_REJECTED': return 'Tài liệu của bạn đã bị từ chối';
      case 'JOIN_APPROVED': return 'Yêu cầu tham gia đã được chấp nhận';
      case 'COMMUNITY_MENTION': return 'Bạn được nhắc đến trong chat';
      default: return 'Bạn có thông báo mới';
    }
  };

  const formatTimeAgo = (iso: string) => {
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
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        className="notification-bell__btn"
        onClick={() => setOpen(!open)}
        title="Thông báo"
        aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ''}`}
      >
        <Icon name="notifications" size={22} />
        {unreadCount > 0 && (
          <span className="notification-bell__badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown__header">
            <span className="notification-dropdown__title">Thông báo</span>
            {unreadCount > 0 && (
              <button className="notification-dropdown__mark-all" onClick={handleMarkAllRead}>
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
        </div>
      )}
    </div>
  );
};
