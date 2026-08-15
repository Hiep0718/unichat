import React from 'react';
import aiAvatar from '../assets/ai-avatar.png';
import './loading-screen.css';

interface LoadingScreenProps {
  message?: string;
  brandTitle?: string;
  fullScreen?: boolean;
}

/**
 * Premium full-screen or container loading screen with 3D AI Emblem and smooth animations.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Đang tải thông tin Workspace...',
  brandTitle = 'UniChat AI Platform',
  fullScreen = true,
}) => {
  return (
    <div className={`loading-screen ${fullScreen ? 'loading-screen--fullscreen' : ''}`}>
      <div className="loading-screen__emblem-container">
        <div className="loading-screen__ring--outer" />
        <div className="loading-screen__ring" />
        <img src={aiAvatar} alt="UniChat AI Logo" className="loading-screen__logo-img" />
      </div>

      <div className="loading-screen__content">
        <h2 className="loading-screen__brand">{brandTitle}</h2>
        <p className="loading-screen__message">
          <span>{message}</span>
          <span className="loading-screen__dots">
            <span className="loading-screen__dot" />
            <span className="loading-screen__dot" />
            <span className="loading-screen__dot" />
          </span>
        </p>
      </div>
    </div>
  );
};

interface LoadingInlineProps {
  label?: string;
}

/**
 * Lightweight inline section spinner for tabs and tables.
 */
export const LoadingInline: React.FC<LoadingInlineProps> = ({ label = 'Đang tải dữ liệu...' }) => {
  return (
    <div className="loading-inline">
      <div className="loading-inline__spinner" />
      <span className="loading-inline__text">{label}</span>
    </div>
  );
};
