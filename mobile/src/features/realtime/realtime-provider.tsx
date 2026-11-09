/**
 * Giữ kết nối STOMP duy nhất của ứng dụng trong suốt thời gian đăng nhập.
 *
 * Gắn phía trên các route chứ không trong một màn hình, nên chuyển giữa các
 * tab và màn tin nhắn không phải dựng lại socket. Tính năng nào cần đích nào
 * thì xin qua {@link useRealtimeSubscription}.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '../auth/auth-context';
import { StompConnection, workChatSocketUrl } from '../../lib/stomp-connection';

import type { ReactNode } from 'react';
import type { FrameHandler } from '../../lib/stomp-connection';

const RealtimeContext = createContext<StompConnection | null>(null);

/** Mở kết nối khi đã đăng nhập và đóng ngay khi đăng xuất. */
export function RealtimeProvider({ children }: { readonly children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const connection = useMemo(() => new StompConnection(workChatSocketUrl()), []);

  useEffect(() => {
    if (!isAuthenticated) {
      // Socket được xác thực bằng token lúc CONNECT, nên để nó mở sau khi
      // đăng xuất là để tin của người trước tiếp tục chảy về máy này.
      connection.deactivate();
      return;
    }
    connection.activate();
    return () => connection.deactivate();
  }, [isAuthenticated, connection]);

  return <RealtimeContext.Provider value={connection}>{children}</RealtimeContext.Provider>;
}

/**
 * Kết nối dùng chung, hoặc null khi ngoài provider.
 *
 * Trả null thay vì ném lỗi vì nhận tin tức thì chỉ là tiện ích: một cây render
 * không có provider (như trong test) vẫn phải chạy được, chỉ không có push.
 */
export function useRealtime(): StompConnection | null {
  return useContext(RealtimeContext);
}

/**
 * Lắng nghe một đích khi component còn được gắn.
 *
 * Handler được đọc qua ref, nên truyền hàm mới mỗi lần render không làm
 * đăng ký lại.
 *
 * @param destination đích user như `/user/queue/messages`
 * @param handler nhận phần thân thô của mỗi frame
 */
export function useRealtimeSubscription(destination: string, handler: FrameHandler): void {
  const connection = useRealtime();
  const latest = useRef(handler);

  useEffect(() => {
    latest.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!connection) return;
    return connection.subscribe(destination, (body) => latest.current(body));
  }, [connection, destination]);
}

/** Push có đang hoạt động không, cho một chỉ báo kín đáo. */
export function useRealtimeStatus(): boolean {
  const connection = useRealtime();
  const [connected, setConnected] = useState(() => connection?.isConnected() ?? false);

  useEffect(() => {
    if (!connection) return;
    return connection.watchStatus(setConnected);
  }, [connection]);

  return connected;
}
