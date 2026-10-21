import aiAvatar from '../assets/ai-avatar.png';
import './loading-screen.css';
import type { LoadingScreenDetails } from './loading-screen-context';

/** Visual content and layout for the canonical loading screen. */
export interface LoadingScreenViewProps extends LoadingScreenDetails {
  readonly fullScreen: boolean;
  /** Keeps the visual mounted but inaccessible while idle; defaults to true. */
  readonly visible?: boolean;
}

/** Renders the premium loading visual independently from request ownership. */
export function LoadingScreenView({ message, brandTitle, fullScreen, visible = true }: LoadingScreenViewProps) {
  return (
    <div className={`loading-screen ${fullScreen ? 'loading-screen--fullscreen' : ''}`}
      role="status" aria-live="polite" aria-busy={visible} aria-hidden={visible ? undefined : true}
      style={{ visibility: visible ? 'visible' : 'hidden' }}>
      <div className="loading-screen__emblem-container" aria-hidden="true">
        <div className="loading-screen__ring--outer" />
        <div className="loading-screen__ring" />
        <img src={aiAvatar} alt="" className="loading-screen__logo-img" />
      </div>
      <div className="loading-screen__content">
        <h2 className="loading-screen__brand">{brandTitle}</h2>
        <p className="loading-screen__message">
          <span>{message}</span>
          <span className="loading-screen__dots" aria-hidden="true">
            <span className="loading-screen__dot" />
            <span className="loading-screen__dot" />
            <span className="loading-screen__dot" />
          </span>
        </p>
      </div>
    </div>
  );
}
