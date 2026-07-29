import { Icon } from '../../components/icon';

export function AdminMetricPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
          Metrics Hệ thống
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
          Theo dõi tổng quan tài nguyên, ingestion job và Prometheus metrics.
        </p>
      </header>

      <div style={{ background: '#f8fafc', padding: '3rem 2rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
        <Icon name="analytics" size={48} style={{ color: '#0284c7', marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
          Tính năng Metrics đang được hoàn thiện
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
          Theo spec §9, các chỉ số số lượng tài liệu, ingestion status, và system metrics không chứa nội dung sẽ được tổng hợp khi backend hoàn tất endpoint `/admin/metrics`.
        </p>
      </div>
    </div>
  );
}

export default AdminMetricPage;
