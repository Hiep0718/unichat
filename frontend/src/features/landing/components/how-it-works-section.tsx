import { Link } from 'react-router-dom';

import { Icon } from '../../../components/icon';
import heroArt from '../../../assets/login-hero.jpg';

import './how-it-works-section.css';

/** Ba bước, theo đúng thứ tự một người mới đi qua chúng. */
const STEPS = [
  {
    no: '01',
    title: 'Tải tài liệu lên',
    body: 'Tạo Workspace cho môn học và tải giáo trình, bài giảng, tài liệu tham khảo vào đó.',
  },
  {
    no: '02',
    title: 'Đặt câu hỏi',
    body: 'Hỏi bằng tiếng Việt: tóm tắt một chương, giải thích một khái niệm hay so sánh hai lý thuyết.',
  },
  {
    no: '03',
    title: 'Nhận câu trả lời có nguồn',
    body: 'Đọc câu trả lời, bấm số trích dẫn để xem đoạn gốc và tiếp tục hỏi sâu hơn.',
  },
] as const;

/** Khối "Ba bước", kèm dải kêu gọi khép lại trang. */
export function HowItWorksSection() {
  return (
    <>
      <section className="steps" id="how-it-works" aria-labelledby="steps-title">
        <div className="steps__inner">
          <div className="steps__head">
            <div>
              <p className="steps__eyebrow">Cách hoạt động</p>
              <h2 id="steps-title" className="steps__title">Ba bước để bắt đầu</h2>
            </div>
            <p className="steps__note">
              UniChat dùng công nghệ RAG: trước khi trả lời, AI tìm đúng những
              đoạn liên quan trong tài liệu của bạn, rồi mới viết câu trả lời
              dựa trên các đoạn đó.
            </p>
          </div>

          <ol className="steps__list">
            {STEPS.map((step, index) => (
              <li
                key={step.no}
                className={`step${index === STEPS.length - 1 ? ' step--last' : ''}`}
              >
                <p className="step__no">{step.no}</p>
                <h3 className="step__title">{step.title}</h3>
                <p className="step__body">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="closing" aria-labelledby="closing-title">
        <div className="closing__inner">
          <img className="closing__art" src={heroArt} alt="" aria-hidden="true" />
          <div className="closing__scrim" />

          <div className="closing__copy">
            <h2 id="closing-title" className="closing__title">
              Bắt đầu học thông minh hơn ngay hôm nay
            </h2>
            <p className="closing__body">
              Tạo tài khoản và tải lên tài liệu đầu tiên của bạn.
            </p>
          </div>

          <div className="closing__actions">
            <Link to="/register" className="closing__cta">
              Bắt đầu
              <Icon name="arrow_forward" size={17} rounded />
            </Link>
            <Link to="/login" className="closing__alt">Tôi đã có tài khoản</Link>
          </div>
        </div>
      </section>
    </>
  );
}
