import { Link } from 'react-router-dom';

import { ErrorState } from './error-state';

/** Shown for any route the router does not know. */
export function NotFoundPage() {
  return (
    <ErrorState
      icon="search_off"
      code="404"
      title="Không tìm thấy trang"
      description="Trang bạn đang tìm không tồn tại hoặc đã bị xóa."
      action={<Link to="/" className="error-state__action">Trở về trang chủ</Link>}
    />
  );
}
