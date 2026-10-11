/** A complete SSE frame; data is decoded only at the blank-line boundary. */
export interface SseFrame { readonly event: string; readonly data: unknown }
/** Parses CRLF, multiline data and fragmented UTF-8 without accepting truncated EOF. */
export class SseFrameParser {
  private buffer = '';
  private event = '';
  private data: string[] = [];
  private readonly decoder = new TextDecoder('utf-8', { fatal: true });
  constructor(private readonly receive: (frame: SseFrame) => void) {}
  /** Adds bytes while retaining incomplete lines and UTF-8 sequences. */
  push(bytes: Uint8Array): void {
    this.buffer += this.decoder.decode(bytes, { stream: true });
    if (this.buffer.length > 1_048_576) throw new Error('Sự kiện stream vượt giới hạn');
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';
    lines.forEach((line) => this.consumeLine(line.replace(/\r$/, '')));
  }
  /** Flushes decoder errors and rejects a frame missing its event boundary. */
  finish(): void {
    this.buffer += this.decoder.decode();
    if (this.buffer.trim() || this.data.length) throw new Error('Stream bị gián đoạn trước khi hoàn tất sự kiện');
  }
  private consumeLine(line: string): void {
    if (!line) { this.dispatch(); return; }
    if (line.startsWith(':')) return;
    const separator = line.indexOf(':');
    const field = separator < 0 ? line : line.slice(0, separator);
    const value = separator < 0 ? '' : line.slice(separator + 1).replace(/^ /, '');
    if (field === 'event') this.event = value;
    if (field === 'data') this.data.push(value);
    if (this.data.reduce((size, part) => size + part.length, 0) > 1_048_576) throw new Error('Sự kiện stream vượt giới hạn');
  }
  private dispatch(): void {
    if (this.data.length) this.receive({ event: this.event || 'message', data: JSON.parse(this.data.join('\n')) as unknown });
    this.event = '';
    this.data = [];
  }
}
