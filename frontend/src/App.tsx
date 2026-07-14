/**
 * Renders the public scaffold screen used to verify the frontend runtime.
 */
export function App() {
  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">AI Knowledge Platform</p>
        <h1 id="hero-title">UniChat</h1>
        <p className="summary">
          Truy hồi tri thức thích ứng, trả lời có căn cứ và trích dẫn rõ ràng
          cho tài liệu học tập.
        </p>
        <dl className="status-grid" aria-label="Trạng thái scaffold">
          <div>
            <dt>Frontend</dt>
            <dd>Sẵn sàng</dd>
          </div>
          <div>
            <dt>Core API</dt>
            <dd>Đang kết nối</dd>
          </div>
          <div>
            <dt>AI Service</dt>
            <dd>Private network</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}