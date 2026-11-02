import { Icon } from '../../../components/icon';

import './features-section.css';

/** Ba trạng thái chia sẻ mà một workspace có thể mang. */
const SHARE_STATES = [
  { name: 'Mongodb', state: 'Công khai', tint: '#1f7a4d' },
  { name: 'OOP', state: 'Được chia sẻ', tint: '#7a3fd4' },
  { name: 'Quản lý dự án', state: 'Riêng tư', tint: '#1f6f7a' },
] as const;

/** Các tính năng nhỏ, mỗi cái một thẻ. */
const SMALL = [
  {
    icon: 'forum',
    title: 'Hỏi bằng tiếng Việt tự nhiên',
    body: 'Đặt câu hỏi như khi đang hỏi thầy cô hay bạn học, không cần từ khóa hay cú pháp đặc biệt.',
  },
  {
    icon: 'grid_view',
    title: 'Workspace cho từng môn học',
    body: 'Gom tài liệu của mỗi môn vào một không gian riêng, để câu trả lời luôn đúng phạm vi bạn đang học.',
  },
] as const;

/**
 * Khối tính năng.
 *
 * Thẻ lớn nhất mang tính năng phân biệt sản phẩm — câu trả lời kèm trích
 * dẫn — và là thẻ duy nhất đặt trên nền tối, nên mắt rơi vào nó trước.
 */
export function FeaturesSection() {
  return (
    <section className="features" id="features" aria-labelledby="features-title">
      <div className="features__inner">
        <p className="features__eyebrow">Tính năng</p>
        <h2 id="features-title" className="features__title">
          Mọi thứ bạn cần để học từ tài liệu của mình
        </h2>

        <div className="features__grid">
          <article className="feat feat--lead">
            <span className="feat__mark feat__mark--on-dark">
              <Icon name="format_quote" size={20} filled />
            </span>
            <h3 className="feat__title">Trả lời kèm trích dẫn nguồn</h3>
            <p className="feat__body">
              Mỗi ý trong câu trả lời đều gắn số trích dẫn. Bấm vào là thấy ngay
              đoạn gốc trong tài liệu, dễ kiểm chứng và dễ đưa vào bài làm.
            </p>

            {/* Dựng lại một đoạn tài liệu với một dòng được đánh dấu: tính
                năng này nói về việc chỉ ra đúng chỗ, nên nó phải được vẽ ra
                chứ không chỉ được kể. */}
            <div className="feat__proof" aria-hidden="true">
              <span className="feat__proof-line" />
              <span className="feat__proof-line feat__proof-line--lit" />
              <span className="feat__proof-line feat__proof-line--lit" />
              <span className="feat__proof-line feat__proof-line--short" />
              <span className="feat__proof-tag">Trích dẫn 1</span>
            </div>
          </article>

          {SMALL.map((item) => (
            <article key={item.icon} className="feat">
              <span className="feat__mark">
                <Icon name={item.icon} size={20} />
              </span>
              <h3 className="feat__title">{item.title}</h3>
              <p className="feat__body">{item.body}</p>
            </article>
          ))}

          <article className="feat">
            <span className="feat__mark">
              <Icon name="group" size={20} />
            </span>
            <h3 className="feat__title">Học nhóm dễ dàng</h3>
            <p className="feat__body">
              Chia sẻ Workspace với bạn cùng lớp hoặc nhóm nghiên cứu, cùng hỏi
              đáp trên một bộ tài liệu.
            </p>
          </article>

          <article className="feat feat--wide">
            <div className="feat__half">
              <span className="feat__mark">
                <Icon name="shield" size={20} />
              </span>
              <h3 className="feat__title">Tài liệu của bạn là của bạn</h3>
              <p className="feat__body">
                Bạn chọn Workspace nào riêng tư, chia sẻ hay công khai. Dữ liệu
                của bạn được bảo mật.
              </p>
            </div>

            <ul className="feat__states" aria-hidden="true">
              {SHARE_STATES.map((row) => (
                <li key={row.name} className="feat__state">
                  <span className="feat__state-mark" style={{ background: row.tint }} />
                  <span className="feat__state-name">{row.name}</span>
                  <span className="feat__state-value">{row.state}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
