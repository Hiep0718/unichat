/**
 * Features bento grid section on the landing page.
 */

import { Icon } from '../../../components/icon';
import './features-section.css';

interface FeatureItem {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly variant: 'primary' | 'secondary' | 'tertiary' | 'dark';
}

const FEATURES: readonly FeatureItem[] = [
  {
    icon: 'search_insights',
    title: 'Tìm kiếm ngữ nghĩa RAG',
    description: 'Không chỉ tìm từ khóa cứng. AI hiểu ngữ cảnh câu hỏi của bạn và tìm đúng đoạn thông tin liên quan trong hàng loạt tài liệu PDF, DOCX dung lượng lớn.',
    variant: 'primary',
  },
  {
    icon: 'format_list_numbered',
    title: 'Trích dẫn minh bạch',
    description: 'Mọi câu trả lời đều đính kèm nguồn trích dẫn chi tiết đến từng trang tài liệu gốc, loại bỏ hoàn toàn rủi ro AI "ảo giác".',
    variant: 'secondary',
  },
  {
    icon: 'folder_special',
    title: 'Quản lý Workspace',
    description: 'Tổ chức tài liệu theo từng môn học hoặc dự án nghiên cứu riêng biệt, không lẫn lộn dữ liệu.',
    variant: 'tertiary',
  },
  {
    icon: 'translate',
    title: 'Tối ưu cho Tiếng Việt',
    description: 'Pipeline xử lý ngôn ngữ tự nhiên được tinh chỉnh đặc biệt để hiểu chính xác các thuật ngữ chuyên ngành và cấu trúc câu phức tạp trong tiếng Việt.',
    variant: 'dark',
  },
];

/**
 * Renders the features bento grid section.
 */
export function FeaturesSection() {
  return (
    <section className="features" id="features">
      <div className="features__inner">
        <div className="features__header">
          <h2 className="features__title">Tính năng nổi bật của MVP</h2>
          <p className="features__subtitle">
            Tập trung giải quyết triệt để vấn đề cốt lõi: tìm kiếm và tổng hợp thông
            tin từ hàng ngàn trang tài liệu phức tạp.
          </p>
        </div>

        <div className="features__grid">
          {FEATURES.map((f) => (
            <FeatureCard key={f.icon} feature={f} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature }: { readonly feature: FeatureItem }) {
  const spanClass = feature.variant === 'primary' || feature.variant === 'dark'
    ? 'features__card--span2'
    : '';

  return (
    <div className={`features__card features__card--${feature.variant} ${spanClass}`}>
      <div className="features__card-icon">
        <Icon name={feature.icon} />
      </div>
      <h3 className="features__card-title">{feature.title}</h3>
      <p className="features__card-desc">{feature.description}</p>
    </div>
  );
}
