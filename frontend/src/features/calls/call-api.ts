/**
 * Call lifecycle API client.
 *
 * Mirrors `CallController`. Only the lifecycle goes over HTTP; the offers,
 * answers and ICE candidates that set a call up travel on the socket, because
 * there are many of them and each is worthless a moment later.
 */
import { fetchJson } from '../../lib/api-client';

/** What the caller asked for. Video is not offered yet. */
export type CallMedia = 'AUDIO' | 'VIDEO';

export type CallStatus =
  | 'RINGING'
  | 'ACTIVE'
  | 'ENDED'
  | 'DECLINED'
  | 'MISSED'
  | 'FAILED';

export type CallEndReason =
  | 'HUNG_UP'
  | 'DECLINED'
  | 'NO_ANSWER'
  | 'OFFLINE'
  | 'BUSY'
  | 'CONNECTION_FAILED';

export interface CallDto {
  readonly id: string;
  readonly conversationId: string;
  readonly callerId: string;
  readonly calleeId: string;
  readonly media: CallMedia;
  readonly status: CallStatus;
  readonly startedAt: string;
  readonly answeredAt: string | null;
  readonly endedAt: string | null;
  readonly endReason: CallEndReason | null;
}

/**
 * One line of a conversation's call history.
 *
 * `outgoing` and `talkSeconds` arrive ready-made from the server rather than
 * being derived here from the timestamps, so two clients cannot disagree
 * about how long a call lasted.
 */
export interface CallHistoryEntryDto {
  readonly id: string;
  readonly outgoing: boolean;
  readonly media: CallMedia;
  readonly status: CallStatus;
  readonly startedAt: string;
  readonly talkSeconds: number;
}

interface CallHistoryPage {
  readonly content: readonly CallHistoryEntryDto[];
}

/** One entry of `RTCConfiguration.iceServers`, ready to pass through. */
export interface IceServerDto {
  readonly urls: readonly string[];
  readonly username: string | null;
  readonly credential: string | null;
}

export interface IceServersDto {
  readonly iceServers: readonly IceServerDto[];
  readonly ttlSeconds: number;
}

/**
 * Rings the other person in a one-to-one conversation.
 *
 * Resolves even when nobody could be rung: an unreachable or busy callee comes
 * back as a call with status `MISSED`, because not being answered is an
 * outcome of calling rather than a failure to call.
 */
export function startCall(conversationId: string, media: CallMedia): Promise<CallDto> {
  return fetchJson(`/conversations/${conversationId}/calls`, {
    method: 'POST',
    body: JSON.stringify({ media }),
  });
}

export function acceptCall(callId: string): Promise<CallDto> {
  return fetchJson(`/calls/${callId}/accept`, { method: 'POST' });
}

export function declineCall(callId: string): Promise<CallDto> {
  return fetchJson(`/calls/${callId}/decline`, { method: 'POST' });
}

export function endCall(callId: string): Promise<CallDto> {
  return fetchJson(`/calls/${callId}/end`, { method: 'POST' });
}

/**
 * Tells the server the media connection never came up.
 *
 * Only this browser can know: the audio never passes through the server, so a
 * call that both sides agreed to but could not connect would otherwise sit as
 * active until the other side gave up.
 */
export function reportCallFailed(callId: string): Promise<CallDto> {
  return fetchJson(`/calls/${callId}/failed`, { method: 'POST' });
}

/**
 * The STUN and TURN servers to try.
 *
 * Fetched per call rather than once at startup: the TURN credentials expire,
 * so a copy kept for the session would be a copy of something that has
 * stopped working.
 */
export function getIceServers(): Promise<IceServersDto> {
  return fetchJson('/calls/ice-servers');
}

/** Turns the server's shape into what `RTCPeerConnection` expects. */
export function toRtcIceServers(dto: IceServersDto): RTCIceServer[] {
  return dto.iceServers.map((server) => {
    const urls = [...server.urls];
    if (!server.username || !server.credential) return { urls };
    return { urls, username: server.username, credential: server.credential };
  });
}

/**
 * One conversation's calls, newest first.
 *
 * Read alongside the messages so a thread can show that a call happened at
 * all. Without it a call leaves no trace in the conversation it belonged to,
 * which is how it looked until now: the endpoint existed and nothing asked.
 */
export function fetchCallHistory(conversationId: string): Promise<readonly CallHistoryEntryDto[]> {
  return fetchJson<CallHistoryPage>(`/conversations/${conversationId}/calls`)
    .then((page) => page.content ?? []);
}
