/**
 * Welcome banner component for the workspace dashboard.
 * Displays a personalized greeting based on time of day and user name.
 */

import { useAuth } from '../../../features/auth/auth-context';

import './welcome-banner.css';

/**
 * Returns a Vietnamese greeting based on the current hour.
 */
function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

/**
 * Extracts a display name from the user's email.
 */
function getDisplayName(email: string): string {
  const localPart = email.split('@')[0] ?? email;
  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}

/**
 * Renders the personalized welcome banner at the top of the dashboard.
 */
export function WelcomeBanner() {
  const { user } = useAuth();

  const greeting = getGreeting();
  const displayName = user?.email ? getDisplayName(user.email) : '';

  return (
    <section className="welcome-banner" aria-label="Lời chào">
      <div className="welcome-banner__content">
        <h2 className="welcome-banner__greeting">
          {greeting}, {displayName}
          <span className="welcome-banner__emoji" aria-hidden="true">👋</span>
        </h2>
        <p className="welcome-banner__subtitle">
          Quản lý và khám phá các không gian tri thức của bạn
        </p>
      </div>
    </section>
  );
}
