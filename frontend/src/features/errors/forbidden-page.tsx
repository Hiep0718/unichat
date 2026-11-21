import { Link } from 'react-router-dom';

import { ErrorState } from './error-state';

/** Shown when the signed-in user lacks the role a route requires. */
export function ForbiddenPage() {
  return (
    <ErrorState
      icon="block"
      code="403"
      tone="danger"
      title="Không có quyền truy cập"
      description="Bạn không có quyền xem trang này hoặc thực hiện hành động này."
      action={<Link to="/" className="error-state__action">Trở về trang chủ</Link>}
    />
  );
}
