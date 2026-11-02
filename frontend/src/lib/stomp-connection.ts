/**
 * One STOMP connection for the whole signed-in application.
 *
 * Before this, Work Chat opened its own socket inside its own page, which made
 * the connection a property of being on that screen. Anything else that needs
 * the server to reach the browser — an incoming call, a notification — cannot
 * work that way, because there is no socket anywhere else in the app.
 *
 * Several features therefore share one connection and subscribe to their own
 * destinations through it. Subscriptions are remembered rather than tied to the
 * socket, so they are re-established on every reconnect without each feature
 * having to notice that the connection dropped.
 */
import { Client } from '@stomp/stompjs';

import { getAccessToken } from './api-client';
import { refreshAccessToken } from './cookie-session';

import type { StompSubscription } from '@stomp/stompjs';

const RECONNECT_MS = 5000;
const HEARTBEAT_MS = 10000;

/** Receives the raw body of one frame. */
export type FrameHandler = (body: string) => void;

/** Called whenever the connection comes up or goes down. */
export type StatusHandler = (connected: boolean) => void;

/**
 * A shared STOMP client that survives navigation.
 *
 * Exported as a class rather than a module-level singleton so tests can build
 * one with a stub client instead of reaching into module state.
 */
export class StompConnection {
  private client: Client | null = null;

  /** Destination to the handlers listening on it. */
  private readonly handlers = new Map<string, Set<FrameHandler>>();

  /** Live subscriptions, by destination, valid only while connected. */
  private readonly subscriptions = new Map<string, StompSubscription>();

  private readonly statusHandlers = new Set<StatusHandler>();

  private connected = false;

  /**
   * Set when the broker rejects a CONNECT, which in this application only
   * happens for a bad or expired token. The next attempt then refreshes rather
   * than replaying the credential that was just refused.
   */
  private authRejected = false;

  constructor(private readonly url: string) {}

  isConnected(): boolean {
    return this.connected;
  }

  /** Opens the connection, or does nothing if it is already open. */
  activate(): void {
    if (this.client) return;

    const client = new Client({
      brokerURL: this.url,
      reconnectDelay: RECONNECT_MS,
      heartbeatIncoming: HEARTBEAT_MS,
      heartbeatOutgoing: HEARTBEAT_MS,
      // Recomputed before every attempt, including automatic reconnects. The
      // previous code read the token once when the effect ran, so stompjs
      // replayed those same headers forever: once the fifteen-minute access
      // token expired, every reconnect failed silently and live delivery
      // stopped without anything on screen saying so.
      beforeConnect: async () => {
        client.connectHeaders = await this.authHeaders();
      },
      onConnect: () => this.onConnected(),
      onDisconnect: () => this.setConnected(false),
      onWebSocketClose: () => this.setConnected(false),
      onStompError: () => {
        // The broker closes the socket on a rejected CONNECT, so this is the
        // only place the refusal can be observed.
        this.authRejected = true;
        this.setConnected(false);
      },
    });

    this.client = client;
    client.activate();
  }

  /** Closes the connection and forgets the live subscriptions, not the handlers. */
  deactivate(): void {
    const client = this.client;
    this.client = null;
    this.subscriptions.clear();
    this.setConnected(false);
    if (client) void client.deactivate();
  }

  /**
   * Listens on a destination for as long as the returned function is uncalled.
   *
   * Safe to call before the connection is up: the destination is remembered
   * and subscribed as soon as it is.
   *
   * @returns a function that removes this handler
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

  /** Watches the connection state, and reports the current one immediately. */
  watchStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.connected);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  /**
   * Sends a frame, dropping it when the connection is down.
   *
   * Dropping is deliberate: everything published here is either ephemeral or
   * has a REST path that is the real source of truth, so queueing a frame to
   * deliver minutes later would be worse than not sending it.
   *
   * @returns whether the frame was handed to the broker
   */
  publish(destination: string, body: unknown): boolean {
    if (!this.client || !this.connected) return false;
    this.client.publish({ destination, body: JSON.stringify(body) });
    return true;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    // A browser cannot set headers on the WebSocket handshake, so the token
    // travels on the CONNECT frame, which is where the server authenticates it.
    const token = this.authRejected
      ? await refreshAccessToken().catch(() => null)
      : getAccessToken() ?? (await refreshAccessToken().catch(() => null));

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
    if (!this.client || !this.client.connected) return;
    if (this.subscriptions.has(destination)) return;

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
        // One listener throwing must not stop the others, nor tear down the
        // subscription that every other feature shares.
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

/** The Work Chat endpoint, on whichever origin is serving the app. */
export function workChatSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/work-chat`;
}
