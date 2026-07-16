/**
 * Workspace list page for authenticated users.
 * Shows the sidebar and a grid of workspaces.
 */

import { SideNavBar } from '../../components/side-nav-bar';
import { Icon } from '../../components/icon';
import { WorkspaceCard } from './components/workspace-card';
import './workspace-list-page.css';

// Mock data based on the design
const MOCK_WORKSPACES = [
  {
    id: '1',
    name: 'Tài liệu môn Trí tuệ nhân tạo',
    description: 'Tổng hợp giáo trình, bài tập và đề thi môn học. Sử dụng để fine-tune model cho bài tập lớn.',
    visibility: 'PUBLIC' as const,
    documentCount: 128,
    memberCount: 45,
    updatedAt: '2 giờ trước',
  },
  {
    id: '2',
    name: 'Khóa luận UniChat',
    description: 'Research papers, reference architectures, và meeting notes cho dự án tốt nghiệp RAG.',
    visibility: 'PRIVATE' as const,
    documentCount: 42,
    memberCount: 1,
    updatedAt: 'Hôm qua, 14:30',
  },
  {
    id: '3',
    name: 'Tài liệu học kỳ 7',
    description: 'Shared workspace của nhóm 3 cho các môn chuyên ngành. Bao gồm slide bài giảng và note.',
    visibility: 'SHARED' as const,
    documentCount: 89,
    memberCount: 5,
    updatedAt: '3 ngày trước',
  },
];

/**
 * Renders the workspace list page including the sidebar layout.
 */
function WorkspaceListPage() {
  return (
    <div className="workspace-layout">
      <SideNavBar />

      <main className="workspace-main">
        <header className="workspace-header">
          <div className="workspace-header__top">
            <h2 className="workspace-header__title">Workspace của tôi</h2>
            <button className="workspace-header__create-btn" type="button">
              <Icon name="add" size={18} />
              Tạo Workspace
            </button>
          </div>

          <div className="workspace-controls">
            <div className="workspace-search">
              <Icon name="search" size={20} className="workspace-search__icon" />
              <input
                className="workspace-search__input"
                type="text"
                placeholder="Tìm kiếm workspace..."
              />
            </div>

            <div className="workspace-filters">
              <button className="workspace-filter workspace-filter--active">Tất cả</button>
              <button className="workspace-filter">Riêng tư</button>
              <button className="workspace-filter">Được chia sẻ</button>
              <button className="workspace-filter">Công khai</button>
            </div>
          </div>
        </header>

        <div className="workspace-content">
          <div className="workspace-grid">
            {MOCK_WORKSPACES.map((ws) => (
              <WorkspaceCard key={ws.id} {...ws} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default WorkspaceListPage;
