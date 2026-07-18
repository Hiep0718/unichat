import { Link } from 'react-router-dom';
import { Icon } from '../../components/icon';

export function ForbiddenPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-primary)' }}>
      <Icon name="block" size={64} className="text-danger" />
      <h2 style={{ color: 'var(--color-danger)', marginTop: '16px' }}>403 - Không có quyền truy cập</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
        Bạn không có quyền xem trang này hoặc thực hiện hành động này.
      </p>
      <Link to="/" style={{ padding: '8px 16px', backgroundColor: 'var(--color-primary)', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
        Trở về trang chủ
      </Link>
    </div>
  );
}
