/**
 * "How it works" 4-step section on the landing page.
 */

import { Icon } from '../../../components/icon';
import './how-it-works-section.css';

interface Step {
  readonly number: number;
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly color: string;
}

const STEPS: readonly Step[] = [
  {
    number: 1,
    icon: 'create_new_folder',
    title: 'Tạo Workspace',
    description: 'Khởi tạo không gian làm việc cho môn học hoặc đồ án của bạn.',
    color: 'var(--color-primary)',
  },
  {
    number: 2,
    icon: 'upload_file',
    title: 'Tải tài liệu lên',
    description: 'Upload PDF, Word, Slide bài giảng. Hệ thống tự động xử lý vector hóa.',
    color: 'var(--color-secondary)',
  },
  {
    number: 3,
    icon: 'forum',
    title: 'Đặt câu hỏi',
    description: 'Hỏi bất cứ điều gì liên quan đến nội dung bằng tiếng Việt tự nhiên.',
    color: 'var(--color-tertiary-container)',
  },
  {
    number: 4,
    icon: 'fact_check',
    title: 'Nhận câu trả lời',
    description: 'AI tổng hợp câu trả lời chính xác, kèm theo trích dẫn trang tài liệu cụ thể.',
    color: 'var(--color-success)',
  },
];

/**
 * Renders the 4-step "How it works" section.
 */
export function HowItWorksSection() {
  return (
    <section className="how-it-works" id="how-it-works">
      <div className="how-it-works__inner">
        <h2 className="how-it-works__title">
          4 bước đơn giản để làm chủ kiến thức
        </h2>

        <div className="how-it-works__steps">
          {STEPS.map((step) => (
            <StepCard key={step.number} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ step }: { readonly step: Step }) {
  return (
    <div className="step-card">
      <div className="step-card__icon-box">
        <span
          className="step-card__number"
          style={{ background: step.color }}
        >
          {step.number}
        </span>
        <Icon name={step.icon} size={40} className="step-card__icon" style={{ color: step.color }} />
      </div>
      <h4 className="step-card__title">{step.title}</h4>
      <p className="step-card__desc">{step.description}</p>
    </div>
  );
}
