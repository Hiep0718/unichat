/**
 * What a member has added to the groups they share with the viewer.
 *
 * The pairs matter more than the totals: documents contributed against those
 * approved says whether the contributions were usable, and replies against
 * accepted answers says whether they resolved anything. A single "23 replies"
 * would flatter someone who posted 23 times and helped nobody.
 */
import { Icon } from '../../../components/icon';
import type { Contributions } from '../profile-api';
import './contribution-stats.css';

interface ContributionStatsProps {
  readonly contributions: Contributions;
}

export function ContributionStats({ contributions }: ContributionStatsProps) {
  const {
    documentsContributed,
    documentsApproved,
    postsWritten,
    repliesWritten,
    answersAccepted,
  } = contributions;

  return (
    <section className="profile-card">
      <h2 className="profile-card__heading">Đóng góp</h2>
      <div className="contribution-stats">
        <div className="contribution-stat">
          <span className="contribution-stat__icon">
            <Icon name="description" size={18} />
          </span>
          <span className="contribution-stat__figure">
            {documentsApproved}
            <span className="contribution-stat__of">/{documentsContributed}</span>
          </span>
          <span className="contribution-stat__label">tài liệu được duyệt</span>
        </div>

        <div className="contribution-stat">
          <span className="contribution-stat__icon">
            <Icon name="check_circle" size={18} />
          </span>
          <span className="contribution-stat__figure">
            {answersAccepted}
            <span className="contribution-stat__of">/{repliesWritten}</span>
          </span>
          <span className="contribution-stat__label">trả lời được chấp nhận</span>
        </div>

        <div className="contribution-stat">
          <span className="contribution-stat__icon">
            <Icon name="forum" size={18} />
          </span>
          <span className="contribution-stat__figure">{postsWritten}</span>
          <span className="contribution-stat__label">bài viết</span>
        </div>
      </div>

      {documentsApproved > 0 && (
        <p className="contribution-stats__note">
          <Icon name="auto_awesome" size={14} />
          {documentsApproved} tài liệu của thành viên này đang được trợ lý AI dùng để trả lời.
        </p>
      )}
    </section>
  );
}
