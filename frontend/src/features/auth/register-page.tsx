/**
 * Register page — split layout with form on left and benefits panel on right.
 */

import { Icon } from '../../components/icon';
import { RegisterForm } from './components/register-form';
import './register-page.css';

/**
 * Renders the register page with form and benefits side panel.
 */
function RegisterPage() {
  return (
    <div className="register-page">
      <main className="register-card">
        <div className="register-card__form-side">
          <div className="register-card__logo">
            <Icon name="school" filled size={28} className="register-card__logo-icon" />
            <span className="register-card__logo-text">UniChat</span>
          </div>

          <div className="register-card__header">
            <h1 className="register-card__title">Tham gia UniChat ngay hôm nay</h1>
            <p className="register-card__subtitle">
              Tạo tài khoản để trải nghiệm hệ thống học tập thông minh RAG.
            </p>
          </div>

          <RegisterForm />
        </div>

        <BenefitsPanel />
      </main>
    </div>
  );
}

export default RegisterPage;

/** Right-side benefits info panel. */
function BenefitsPanel() {
  return (
    <div className="benefits-panel">
      <h2 className="benefits-panel__title">Lợi ích khi tham gia UniChat</h2>

      <div className="benefits-panel__items">
        <BenefitItem
          icon="auto_awesome"
          iconBg="var(--color-primary-container)"
          iconColor="var(--color-primary)"
          title="Công nghệ RAG tiên tiến"
          description="Hệ thống truy xuất thông minh giúp AI trả lời chính xác dựa trên tài liệu học thuật của bạn."
        />
        <BenefitItem
          icon="menu_book"
          iconBg="var(--color-surface-container-high)"
          iconColor="var(--color-secondary)"
          title="Quản lý tài liệu thông minh"
          description="Tổ chức, phân tích và trích xuất kiến thức từ hàng ngàn trang tài liệu chỉ trong vài giây."
        />
        <BenefitItem
          icon="group"
          iconBg="var(--color-error-container)"
          iconColor="var(--color-on-error-container)"
          title="Hợp tác dễ dàng"
          description="Chia sẻ không gian làm việc và cùng nghiên cứu với các thành viên trong nhóm."
        />
      </div>

      <div className="benefits-panel__testimonial">
        <p className="benefits-panel__quote">
          &ldquo;UniChat đã giúp tôi tiết kiệm hàng giờ đọc tài liệu nghiên cứu mỗi tuần.&rdquo;
        </p>
        <div className="benefits-panel__author">
          <div className="benefits-panel__avatar">
            <Icon name="person" size={16} />
          </div>
          <div>
            <p className="benefits-panel__name">Nguyễn Văn A</p>
            <p className="benefits-panel__role">Nghiên cứu sinh</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BenefitItem({
  icon,
  iconBg,
  iconColor,
  title,
  description,
}: {
  readonly icon: string;
  readonly iconBg: string;
  readonly iconColor: string;
  readonly title: string;
  readonly description: string;
}) {
  return (
    <div className="benefit-item">
      <div className="benefit-item__icon" style={{ background: iconBg }}>
        <Icon name={icon} size={20} style={{ color: iconColor }} />
      </div>
      <div>
        <h3 className="benefit-item__title">{title}</h3>
        <p className="benefit-item__desc">{description}</p>
      </div>
    </div>
  );
}
