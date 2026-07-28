import { Icon } from '../../components/icon';
import { useWorkspace } from '../workspaces/workspace-context';

export function EvaluationPage() {
  const { workspace } = useWorkspace();

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
          Đánh giá RAG — {workspace?.name || 'Workspace'}
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
          Chạy benchmark so sánh chất lượng giữa BASELINE và ADAPTIVE Retrieval.
        </p>
      </header>

      <div style={{ background: '#f8fafc', padding: '3rem 2rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
        <Icon name="biotech" size={48} style={{ color: '#0284c7', marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
          Mô-đun Evaluation đang được chuẩn bị
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '560px', margin: '0 auto' }}>
          Theo spec §8, tính năng Đánh giá sẽ cho phép đo lường Hit@K, Citation Accuracy, Refusal F1 và Groundedness trên tập dữ liệu 120 test cases.
        </p>
      </div>
    </div>
  );
}

export default EvaluationPage;
