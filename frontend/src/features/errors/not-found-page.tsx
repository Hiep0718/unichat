import { Link } from 'react-router-dom';
import { Icon } from '../../components/icon';

export function NotFoundPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-primary)' }}>
      <Icon name="search_off" size={64} className="text-secondary" />
      <h2 style={{ color: 'var(--color-text-primary)', marginTop: '16px' }}>404 - Không tìm thấy trang</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
        Trang bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.
      </p>
      <Link to="/" style={{ padding: '8px 16px', backgroundColor: 'var(--color-primary)', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
        Trở về trang chủ
      </Link>
    </div>
  );
}
