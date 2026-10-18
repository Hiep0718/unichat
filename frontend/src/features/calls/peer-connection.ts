/**
 * The WebRTC half of a call: microphone, peer connection, negotiation.
 *
 * Wrapped rather than used directly so the ordering problems live in one
 * place. Two of them matter and neither is obvious:
 *
 * 1. ICE candidates arrive before the description they belong to. The caller
 *    starts gathering the moment it has a local offer, so its candidates
 *    reach the callee while the callee still has no peer connection at all.
 *    Adding a candidate before `setRemoteDescription` throws, so early ones
 *    are held and replayed.
 *
 * 2. The callee must not open the microphone until the call is answered.
 *    Building the peer connection on the offer would make the browser ask for
 *    permission while the phone is still ringing, which is both alarming and
 *    wrong if the call is then declined.
 */
import type { SignalKind } from './call-signalling';

/** Where an outgoing frame goes. */
export type SignalSender = (kind: SignalKind, payload: string) => void;

export interface PeerCallbacks {
  /** Media is flowing. */
  readonly onConnected: () => void;
  /** The connection failed or dropped for good. */
  readonly onFailed: () => void;
  /** The other side's audio, ready to be played. */
  readonly onRemoteStream: (stream: MediaStream) => void;
}

/** Audio only in this phase; the constraints are the one place video is added. */
const AUDIO_ONLY: MediaStreamConstraints = { audio: true, video: false };

/**
 * One call's peer connection.
 *
 * Created when a call starts and discarded when it ends — a connection is
 * never reused, because renegotiating a failed one is harder to reason about
 * than starting again.
 */
export class CallPeer {
  private readonly connection: RTCPeerConnection;

  private localStream: MediaStream | null = null;

  /** Candidates that arrived before there was a remote description. */
  private readonly pendingCandidates: RTCIceCandidateInit[] = [];

  private closed = false;

  constructor(
    configuration: RTCConfiguration,
    private readonly send: SignalSender,
    private readonly callbacks: PeerCallbacks,
  ) {
    this.connection = new RTCPeerConnection(configuration);

    this.connection.onicecandidate = (event) => {
      if (!event.candidate || this.closed) return;
      this.send('ICE', JSON.stringify(event.candidate.toJSON()));
    };

    this.connection.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) this.callbacks.onRemoteStream(stream);
    };

    this.connection.onconnectionstatechange = () => {
      if (this.closed) return;
      const state = this.connection.connectionState;
      if (state === 'connected') this.callbacks.onConnected();
      // 'disconnected' can recover on its own, so only the states that cannot
      // are treated as the end.
      if (state === 'failed' || state === 'closed') this.callbacks.onFailed();
    };
  }

  /**
   * Opens the microphone and sends an offer.
   *
   * Sent while the callee's phone is still ringing rather than after they
   * answer, so that answering connects immediately instead of starting a
   * negotiation the person waits through.
   */
  async offer(): Promise<void> {
    await this.openMicrophone();
    const offer = await this.connection.createOffer();
    await this.connection.setLocalDescription(offer);
    this.send('OFFER', JSON.stringify(offer));
  }

  /**
   * Opens the microphone and answers an offer held since it arrived.
   *
   * @param offerSdp the offer, as the other side serialised it
   */
  async answer(offerSdp: string): Promise<void> {
    await this.connection.setRemoteDescription(
      JSON.parse(offerSdp) as RTCSessionDescriptionInit,
    );
    await this.drainCandidates();

    await this.openMicrophone();
    const answer = await this.connection.createAnswer();
    await this.connection.setLocalDescription(answer);
    this.send('ANSWER', JSON.stringify(answer));
  }

  /** The callee's answer came back. */
  async acceptAnswer(answerSdp: string): Promise<void> {
    await this.connection.setRemoteDescription(
      JSON.parse(answerSdp) as RTCSessionDescriptionInit,
    );
    await this.drainCandidates();
  }

  /**
   * Adds a candidate, or holds it if the description is not set yet.
   *
   * Holding rather than dropping: a discarded candidate is one network path
   * the two sides will never try, and on a restrictive network it may have
   * been the only one.
   */
  async addCandidate(candidateJson: string): Promise<void> {
    const candidate = JSON.parse(candidateJson) as RTCIceCandidateInit;
    if (!this.connection.remoteDescription) {
      this.pendingCandidates.push(candidate);
      return;
    }
    await this.connection.addIceCandidate(candidate);
  }

  /**
   * Stops or resumes sending audio.
   *
   * Disables the track rather than dropping it: removing a track renegotiates
   * the whole connection, and the other side would hear the call glitch every
   * time somebody muted.
   */
  setMuted(muted: boolean): void {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  /**
   * Releases the microphone and tears the connection down.
   *
   * Stopping the tracks is the part that matters: without it the browser's
   * recording indicator stays on after the call, which looks exactly like
   * being listened to.
   */
  close(): void {
    if (this.closed) return;
    this.closed = true;

    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;

    this.connection.onicecandidate = null;
    this.connection.ontrack = null;
    this.connection.onconnectionstatechange = null;
    this.connection.close();
  }

  private async openMicrophone(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia(AUDIO_ONLY);
    if (this.closed) {
      // The call ended while the permission prompt was open.
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    this.localStream = stream;
    stream.getTracks().forEach((track) => this.connection.addTrack(track, stream));
  }

  private async drainCandidates(): Promise<void> {
    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      if (candidate) await this.connection.addIceCandidate(candidate);
    }
  }
}
