/**
 * Hero section of the landing page.
 * Displays the main headline, description, CTA buttons, and product mockup.
 */

import { Icon } from '../../../components/icon';
import './hero-section.css';

/**
 * Renders the hero section with copy, CTAs, and browser mockup preview.
 */
export function HeroSection() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__inner">
        <HeroCopy />
        <HeroMockup />
      </div>
    </section>
  );
}

/** Left-side marketing copy with headline, description, and CTAs. */
function HeroCopy() {
  return (
    <div className="hero__copy">
      <div className="hero__badge">
        <span className="hero__badge-dot">
          <span className="hero__badge-ping" />
          <span className="hero__badge-core" />
        </span>
        UniChat v1.0 Mới ra mắt
      </div>

      <h1 id="hero-title" className="hero__title">
        Trợ lý hỏi đáp tài liệu học tập bằng{' '}
        <span className="hero__rag">RAG</span>
      </h1>

      <p className="hero__desc">
        Tải tài liệu học tập lên Workspace, đặt câu hỏi tiếng Việt và nhận câu trả lời
        có trích dẫn nguồn rõ ràng. Giải pháp tối ưu cho sinh viên, nghiên cứu sinh và
        giảng viên.
      </p>

      <div className="hero__cta-group">
        <button className="hero__cta-primary" type="button">
          Bắt đầu miễn phí
          <Icon name="arrow_forward" size={18} />
        </button>
        <button className="hero__cta-secondary" type="button">
          <Icon name="play_circle" size={18} />
          Xem demo
        </button>
      </div>

      <div className="hero__social-proof">
        <p>Hơn 5,000+ sinh viên &amp; nghiên cứu sinh tin dùng</p>
      </div>
    </div>
  );
}

/** Right-side browser mockup demonstrating the chat interface. */
function HeroMockup() {
  return (
    <div className="hero__mockup-wrapper">
      <div className="hero__mockup-glow" />
      <div className="hero__mockup">
        <MockupHeader />
        <MockupContent />
        <MockupInput />
      </div>
      <FloatingElements />
    </div>
  );
}

function MockupHeader() {
  return (
    <div className="mockup__header">
      <div className="mockup__dots">
        <span className="mockup__dot mockup__dot--red" />
        <span className="mockup__dot mockup__dot--yellow" />
        <span className="mockup__dot mockup__dot--green" />
      </div>
      <div className="mockup__url">
        <Icon name="lock" size={12} /> unichat.vn/workspace
      </div>
    </div>
  );
}

function MockupContent() {
  return (
    <div className="mockup__body">
      <div className="mockup__user-msg">
        <p>
          Tóm tắt các nguyên lý cơ bản của cơ học lượng tử dựa theo tài liệu Vật lý
          Đại cương tập 3.
        </p>
      </div>

      <div className="mockup__ai-thinking">
        <div className="mockup__ai-avatar">
          <Icon name="school" size={14} />
        </div>
        <div className="mockup__thinking-pill">
          <span className="mockup__spinner" />
          <span>Đang trích xuất từ 3 tài liệu...</span>
        </div>
      </div>

      <div className="mockup__ai-msg">
        <p>
          Dựa trên tài liệu &ldquo;Vật lý Đại cương Tập 3&rdquo;, cơ học lượng tử được
          xây dựng dựa trên các nguyên lý cơ bản sau:
        </p>
        <ul>
          <li>
            <strong>Tính lưỡng tính sóng - hạt:</strong> Vật chất vừa có tính chất sóng
            vừa có tính chất hạt{' '}
            <span className="mockup__cite">[1]</span>.
          </li>
          <li>
            <strong>Nguyên lý bất định Heisenberg:</strong> Không thể xác định đồng thời
            chính xác cả vị trí và động lượng của một hạt vi mô{' '}
            <span className="mockup__cite">[2]</span>.
          </li>
        </ul>
      </div>
    </div>
  );
}

function MockupInput() {
  return (
    <div className="mockup__input-area">
      <div className="mockup__input-wrap">
        <input
          className="mockup__input"
          placeholder="Nhập câu hỏi của bạn..."
          readOnly
          type="text"
        />
        <button className="mockup__send-btn" type="button" aria-label="Gửi">
          <Icon name="send" size={18} />
        </button>
      </div>
    </div>
  );
}

function FloatingElements() {
  return (
    <>
      <div className="hero__float hero__float--citation">
        <Icon name="check_circle" size={20} className="hero__float-icon" />
        <p>Trích dẫn chính xác 100%</p>
      </div>
    </>
  );
}
