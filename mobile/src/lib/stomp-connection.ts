/**
 * Một kết nối STOMP dùng chung cho cả ứng dụng khi đã đăng nhập.
 *
 * Bản di động của `frontend/src/lib/stomp-connection.ts`. Khác biệt duy nhất
 * là cách lấy token và vài cờ mà stompjs cần riêng trên React Native: RN cắt
 * mất ký tự NULL kết thúc mỗi frame, nên phải bù lại ở chiều nhận và gửi
 * frame dạng nhị phân ở chiều đi.
 *
 * Đăng ký được ghi nhớ theo đích chứ không gắn vào socket, nên mỗi lần kết nối
 * lại đều được mở lại mà từng tính năng không phải tự theo dõi.
 */
import { Client } from '@stomp/stompjs';
import { Platform } from 'react-native';

import { getAccessToken, getApiBaseUrl, getOrRefreshToken } from './api-client';

import type { StompConfig, StompSubscription } from '@stomp/stompjs';

const RECONNECT_MS = 5000;
const HEARTBEAT_MS = 10000;

/** Nhận phần thân thô của một frame. */
export type FrameHandler = (body: string) => void;

/** Được gọi mỗi khi kết nối lên hoặc rớt. */
export type StatusHandler = (connected: boolean) => void;

/** Phần của stompjs `Client` mà lớp này dùng tới, để test thay bằng bản giả. */
export type StompClientFactory = (config: StompConfig) => Client;

const defaultFactory: StompClientFactory = (config) => new Client(config);

/**
 * Kết nối STOMP sống qua các lần chuyển màn hình.
 *
 * Là một lớp chứ không phải singleton cấp module, để test dựng được một bản
 * với client giả thay vì phải chạm vào trạng thái module.
 */
export class StompConnection {
  private client: Client | null = null;
  private readonly handlers = new Map<string, Set<FrameHandler>>();
  private readonly subscriptions = new Map<string, StompSubscription>();
  private readonly statusHandlers = new Set<StatusHandler>();
  private connected = false;

  /**
   * Bật khi máy chủ từ chối CONNECT, việc chỉ xảy ra với token sai hoặc hết
   * hạn. Lần thử sau sẽ làm mới token thay vì gửi lại đúng thứ vừa bị từ chối.
   */
  private authRejected = false;

  constructor(
    private readonly url: string,
    private readonly createClient: StompClientFactory = defaultFactory,
  ) {}

  /** Kết nối hiện có đang mở không. */
  isConnected(): boolean {
    return this.connected;
  }

  /** Mở kết nối, hoặc không làm gì nếu đã mở. */
  activate(): void {
    if (this.client) return;
    const native = Platform.OS !== 'web';
    const client = this.createClient({
      brokerURL: this.url,
      reconnectDelay: RECONNECT_MS,
      heartbeatIncoming: HEARTBEAT_MS,
      heartbeatOutgoing: HEARTBEAT_MS,
      forceBinaryWSFrames: native,
      appendMissingNULLonIncoming: native,
      // Tính lại trước mỗi lần thử, kể cả khi tự kết nối lại: token truy cập
      // chỉ sống 15 phút nên bản đọc một lần sẽ hỏng ở lần kết nối lại sau đó.
      beforeConnect: async () => {
        client.connectHeaders = await this.authHeaders();
      },
      onConnect: () => this.onConnected(),
      onDisconnect: () => this.setConnected(false),
      onWebSocketClose: () => this.setConnected(false),
      onStompError: () => {
        this.authRejected = true;
        this.setConnected(false);
      },
    });
    this.client = client;
    client.activate();
  }

  /** Đóng kết nối và quên các đăng ký đang sống, nhưng giữ handler. */
  deactivate(): void {
    const client = this.client;
    this.client = null;
    this.subscriptions.clear();
    this.setConnected(false);
    if (client) void client.deactivate();
  }

  /**
   * Lắng nghe một đích cho tới khi hàm trả về được gọi.
   *
   * Gọi được cả trước khi kết nối lên: đích được nhớ và đăng ký ngay khi có.
   *
   * @returns hàm gỡ handler này
   */
  subscribe(destination: string, handler: FrameHandler): () => void {
    const existing = this.handlers.get(destination);
    if (existing) {
      existing.add(handler);
    } else {
      this.handlers.set(destination, new Set([handler]));
      this.openSubscription(destination);
    }
    return () => this.unsubscribe(destination, handler);
  }

  /** Theo dõi trạng thái kết nối, và báo ngay trạng thái hiện tại. */
  watchStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.connected);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  private async authHeaders(): Promise<Record<string, string>> {
    // Token đi trên frame CONNECT, nơi máy chủ xác thực nó.
    const cached = this.authRejected ? null : getAccessToken();
    const token = cached ?? (await getOrRefreshToken().catch(() => null));
    this.authRejected = false;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private onConnected(): void {
    this.authRejected = false;
    this.subscriptions.clear();
    this.handlers.forEach((_, destination) => this.openSubscription(destination));
    this.setConnected(true);
  }

  private openSubscription(destination: string): void {
    if (!this.client?.connected || this.subscriptions.has(destination)) return;
    this.subscriptions.set(
      destination,
      this.client.subscribe(destination, (frame) => this.dispatch(destination, frame.body)),
    );
  }

  private dispatch(destination: string, body: string): void {
    this.handlers.get(destination)?.forEach((handler) => {
      try {
        handler(body);
      } catch {
        // Một handler ném lỗi không được chặn các handler khác, cũng không
        // được làm sập đăng ký mà mọi tính năng đang dùng chung.
      }
    });
  }

  private unsubscribe(destination: string, handler: FrameHandler): void {
    const handlers = this.handlers.get(destination);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size > 0) return;
    this.handlers.delete(destination);
    this.subscriptions.get(destination)?.unsubscribe();
    this.subscriptions.delete(destination);
  }

  private setConnected(connected: boolean): void {
    if (this.connected === connected) return;
    this.connected = connected;
    this.statusHandlers.forEach((handler) => handler(connected));
  }
}

/**
 * Địa chỉ socket Work Chat, suy ra từ địa chỉ API.
 *
 * Trên điện thoại không có `window.location`, nên dùng đúng gốc mà REST đang
 * gọi tới, đổi http thành ws.
 */
export function workChatSocketUrl(apiBaseUrl: string = getApiBaseUrl()): string {
  return `${apiBaseUrl.replace(/^http/, 'ws')}/ws/work-chat`;
}
