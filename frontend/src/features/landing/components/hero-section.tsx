import { Link } from 'react-router-dom';

import { Icon } from '../../../components/icon';
import heroArt from '../../../assets/login-hero.jpg';

import './hero-section.css';

/**
 * Hai ý chính của câu trả lời mẫu, mỗi ý kèm số trích dẫn.
 *
 * Số trích dẫn là phần đáng kể: nó là thứ phân biệt sản phẩm này với một
 * hộp chat bất kỳ, nên bản demo phải cho thấy nó chứ không chỉ nói về nó.
 */
const DEMO_POINTS = [
  {
    term: 'Lưỡng tính sóng – hạt',
    body: 'vật chất vừa có tính chất sóng vừa có tính chất hạt',
    cite: 1,
  },
  {
    term: 'Nguyên lý bất định Heisenberg',
    body: 'không thể xác định đồng thời chính xác cả vị trí và động lượng của một hạt vi mô',
    cite: 2,
  },
] as const;

/** Dải mở đầu của trang giới thiệu. */
export function HeroSection() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <img className="hero__art" src={heroArt} alt="" aria-hidden="true" />
      <div className="hero__scrim" />

      <div className="hero__inner">
        <HeroCopy />
        <HeroDemo />
      </div>
    </section>
  );
}

/** Nửa trái: lời chào hàng và lối vào. */
function HeroCopy() {
  return (
    <div className="hero__copy">
      <p className="hero__badge">
        <span className="hero__badge-tag">Mới</span>
        UniChat v1.0 đã ra mắt
      </p>

      {/* Khoảng trắng trước mỗi <br /> là bắt buộc: thẻ ngắt dòng không sinh
          ra khoảng trắng nào, nên thiếu chúng thì tên khả truy cập của tiêu đề
          là "Hỏi đáp trên chínhtài liệu học tậpcủa bạn." và trình đọc màn hình
          đọc dính chữ. Mắt không thấy điều này; một test đối chiếu tên khả
          truy cập thì thấy. */}
      <h1 id="hero-title" className="hero__title">
        Hỏi đáp trên chính{' '}
        <br />
        <span className="hero__title-accent">tài liệu học tập</span>{' '}
        <br />
        của bạn.
      </h1>

      <p className="hero__desc">
        Tải giáo trình, bài giảng lên Workspace, đặt câu hỏi bằng tiếng Việt và
        nhận câu trả lời kèm trích dẫn nguồn rõ ràng. Dành cho sinh viên, nghiên
        cứu sinh và giảng viên.
      </p>

      <Link to="/register" className="hero__cta">
        Bắt đầu
        <Icon name="arrow_forward" size={18} rounded />
      </Link>

      {/* Mockup ghi "Hơn 5.000 sinh viên tin dùng". Đó là một con số về lượng
          người dùng, và không có nguồn nào trong sản phẩm chứng minh được nó,
          nên ở đây là một câu nói đúng điều sản phẩm làm. Chủ sản phẩm quyết
          định có đưa con số thật vào hay không. */}
      <p className="hero__proof">
        <Icon name="verified" size={16} />
        Mọi câu trả lời đều dẫn lại nguồn trong tài liệu của bạn
      </p>
    </div>
  );
}

/** Nửa phải: một cửa sổ trình duyệt dựng lại cuộc hỏi đáp thật. */
function HeroDemo() {
  return (
    <div className="hero__demo" id="demo" aria-hidden="true">
      <div className="demo__chrome">
        <span className="demo__dot demo__dot--red" />
        <span className="demo__dot demo__dot--amber" />
        <span className="demo__dot demo__dot--green" />
        <span className="demo__url">
          <Icon name="lock" size={12} />
          unichat.vn/workspace
        </span>
      </div>

      <div className="demo__body">
        <p className="demo__ask">
          Tóm tắt các nguyên lý cơ bản của cơ học lượng tử dựa theo tài liệu Vật
          lý Đại cương Tập 3.
        </p>

        <div className="demo__row">
          <span className="demo__spark">
            <Icon name="auto_awesome" size={14} filled />
          </span>
          <span className="demo__found">
            <Icon name="check" size={13} />
            Đã tìm trong 3 tài liệu
          </span>
        </div>

        <div className="demo__answer">
          <p className="demo__lede">
            Dựa trên tài liệu “Vật lý Đại cương Tập 3”, cơ học lượng tử được xây
            dựng trên các nguyên lý cơ bản sau:
          </p>
          <ul className="demo__points">
            {DEMO_POINTS.map((point) => (
              <li key={point.cite}>
                <strong>{point.term}:</strong> {point.body}
                <span className="demo__cite">{point.cite}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="demo__note">
          <span className="demo__note-left">
            <Icon name="check_circle" size={14} />
            Mọi câu trả lời đều có nguồn
          </span>
          <span className="demo__note-count">2 đoạn trích</span>
        </p>

        <div className="demo__input">
          <span className="demo__placeholder">Nhập câu hỏi của bạn...</span>
          <span className="demo__send">
            <Icon name="arrow_upward" size={14} rounded />
          </span>
        </div>
      </div>
    </div>
  );
}
