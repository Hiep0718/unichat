import { Link } from 'react-router-dom';

import { Icon } from '../../../components/icon';
import { useAuth } from '../../auth/auth-context';
import { HeroAsk } from './hero-ask';
import { heroPrompts } from '../hero-prompts';
import { summariseWorkspaces } from '../workspace-totals';
import bandArt from '../../../assets/greeting-band.jpg';

import type { WorkspaceDto } from '../workspace-schema';

import './welcome-banner.css';

const WEEKDAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

/** Lời chào theo giờ trong ngày. */
function getGreeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

/** Ngày hôm nay, viết như người Việt đọc nó. */
function formatToday(now: Date): string {
  return `${WEEKDAYS[now.getDay()]}, ${now.getDate()} tháng ${now.getMonth() + 1}`;
}

/** Tên hiển thị rút từ email khi tài khoản chưa đặt tên. */
function getEmailFallback(email: string): string {
  const localPart = email.split('@')[0] ?? email;
  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}

const STAT_ICONS: Readonly<Record<string, string>> = {
  workspaces: 'folder',
  documents: 'description',
  members: 'group',
};

interface WelcomeBannerProps {
  readonly workspaces?: readonly WorkspaceDto[] | undefined;
}

/**
 * Dải chào: lời chào, một ô hỏi nhanh, và ba con số của tài khoản.
 *
 * Đây là mảng màu đặc duy nhất của màn hình ngoài thanh bên, nên nó vượt
 * ngân sách 5% mà nghiên cứu màn ứng dụng ghi nhận. Đó là lựa chọn của chủ
 * sản phẩm theo mockup, và được ghi lại ở đây để người đọc sau biết là cố ý
 * chứ không phải quên.
 */
export function WelcomeBanner({ workspaces = [] }: WelcomeBannerProps) {
  const { user } = useAuth();
  const now = new Date();

  const displayName =
    user?.displayName?.trim() || (user?.email ? getEmailFallback(user.email) : '');
  const stats = summariseWorkspaces(workspaces);
  const prompts = heroPrompts(workspaces);

  return (
    <section className="welcome-banner" aria-label="Lời chào">
      {/* Ảnh nền chìm. Để ở độ mờ thấp nên dải vẫn đọc ra là một mảng xanh
          đặc, và mọi cặp tương phản đã đo trên mảng ấy giữ nguyên. */}
      <img className="welcome-banner__art" src={bandArt} alt="" aria-hidden="true" />
      <div className="welcome-banner__main">
        <p className="welcome-banner__date">
          <Icon name="calendar_today" size={14} />
          {formatToday(now)}
        </p>

        <h1 className="welcome-banner__greeting">
          {getGreeting(now)}{displayName ? `, ${displayName}` : ''}
        </h1>

        <p className="welcome-banner__subtitle">
          Quản lý và khám phá các không gian tri thức của bạn — hoặc hỏi UniChat
          bất cứ điều gì trong tài liệu đã có.
        </p>

        <HeroAsk workspaces={workspaces} />

        {prompts.length > 0 && (
          <ul className="welcome-banner__chips">
            {prompts.map((prompt) => (
              <li key={prompt.workspaceId}>
                <Link
                  className="welcome-banner__chip"
                  to={`/workspaces/${prompt.workspaceId}/chat?q=${encodeURIComponent(prompt.question)}`}
                >
                  {prompt.label}
                </Link>
              </li>
            ))}
          </ul>
        )}

      </div>

      <ul className="welcome-banner__stats" aria-label="Thống kê nhanh">
        {stats.map((stat) => (
          <li key={stat.key} className="welcome-banner__stat">
            <div className="welcome-banner__stat-text">
              <span className="welcome-banner__stat-value">{stat.value}</span>
              <span className="welcome-banner__stat-label">{stat.label}</span>
            </div>
            <span className="welcome-banner__stat-icon">
              <Icon name={STAT_ICONS[stat.key] ?? 'folder'} size={18} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
