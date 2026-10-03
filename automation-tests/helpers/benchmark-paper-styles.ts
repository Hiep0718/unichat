/**
 * Executive Styling Module for Practical Instructor & Thesis Council Presentation.
 * Designed for readability, clarity, and empirical proof verification.
 */

export function getAcademicPaperCss(): string {
  return `
    :root {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --card-border: #e2e8f0;
      --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
      --header-bg: #0f172a;
      --header-text: #ffffff;
      --text-main: #1e293b;
      --text-muted: #64748b;
      --text-light: #94a3b8;
      --accent-blue: #0284c7;
      --accent-blue-light: #e0f2fe;
      --accent-green: #16a34a;
      --accent-green-light: #dcfce7;
      --accent-amber: #d97706;
      --accent-amber-light: #fef3c7;
      --accent-purple: #7c3aed;
      --accent-purple-light: #ede9fe;
      --accent-red: #dc2626;
      --accent-red-light: #fee2e2;
      --font-main: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background-color: var(--bg);
      color: var(--text-main);
      font-family: var(--font-main);
      font-size: 15px;
      line-height: 1.6;
      padding: 0 0 4rem 0;
      -webkit-font-smoothing: antialiased;
    }

    /* Executive Top Banner */
    .top-banner {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: var(--header-text);
      padding: 3rem 1.5rem 2.5rem;
      border-bottom: 4px solid var(--accent-blue);
    }
    .banner-container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .banner-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(2, 132, 199, 0.2);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 1rem;
    }
    .banner-title {
      font-size: 2.1rem;
      font-weight: 800;
      line-height: 1.25;
      margin-bottom: 0.5rem;
      color: #ffffff;
      letter-spacing: -0.02em;
    }
    .banner-subtitle {
      font-size: 1.1rem;
      color: #94a3b8;
      font-weight: 400;
      margin-bottom: 1.5rem;
      line-height: 1.5;
    }
    .banner-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      font-size: 0.85rem;
      color: #cbd5e1;
      padding-top: 1.25rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    .banner-meta-item strong { color: #ffffff; }

    /* Main Content Wrapper */
    .main-wrapper {
      max-width: 1200px;
      margin: -1.5rem auto 0;
      padding: 0 1.5rem;
    }

    /* KPI Highlights Row */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 1.25rem 1.5rem;
      box-shadow: var(--card-shadow);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }
    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 4px;
    }
    .kpi-blue::before { background: var(--accent-blue); }
    .kpi-green::before { background: var(--accent-green); }
    .kpi-purple::before { background: var(--accent-purple); }
    .kpi-amber::before { background: var(--accent-amber); }

    .kpi-header { font-size: 0.82rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .kpi-value { font-size: 2.2rem; font-weight: 800; color: var(--text-main); margin: 0.4rem 0 0.2rem; line-height: 1.1; }
    .kpi-sub { font-size: 0.82rem; color: var(--text-muted); line-height: 1.4; }
    .kpi-sub strong { color: var(--text-main); }

    /* Section Containers */
    .content-section {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: var(--card-shadow);
    }
    .section-header {
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 1rem;
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .section-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .section-desc {
      font-size: 0.9rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    /* Comparison Grid & Tables */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }
    table.data-table th {
      background: #f8fafc;
      color: var(--text-muted);
      font-weight: 700;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 10px 14px;
      text-align: left;
      border-bottom: 2px solid var(--card-border);
    }
    table.data-table td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--card-border);
      color: var(--text-main);
      vertical-align: middle;
    }
    table.data-table tr:hover td {
      background-color: #f8fafc;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }

    /* Pill Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      line-height: 1;
    }
    .badge-green { background: var(--accent-green-light); color: var(--accent-green); }
    .badge-blue { background: var(--accent-blue-light); color: var(--accent-blue); }
    .badge-amber { background: var(--accent-amber-light); color: var(--accent-amber); }
    .badge-red { background: var(--accent-red-light); color: var(--accent-red); }
    .badge-purple { background: var(--accent-purple-light); color: var(--accent-purple); }

    /* Practical Application Cards */
    .usage-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 1.5rem;
      margin-top: 1rem;
    }
    .usage-card {
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 1.5rem;
      background: #fbfcfe;
    }
    .usage-card-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .usage-icon {
      width: 40px; height: 40px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.25rem; font-weight: 700;
    }
    .icon-strict { background: #e0f2fe; color: #0284c7; }
    .icon-hybrid { background: #ede9fe; color: #7c3aed; }
    .usage-title { font-weight: 800; font-size: 1.05rem; color: var(--text-main); }
    .usage-list { list-style: none; margin-top: 0.75rem; }
    .usage-list li {
      font-size: 0.85rem; color: var(--text-muted); padding: 5px 0;
      display: flex; align-items: flex-start; gap: 0.5rem;
    }
    .usage-list li strong { color: var(--text-main); }

    /* Interactive Inspector Controls */
    .inspector-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
      align-items: center;
      background: #f8fafc;
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid var(--card-border);
    }
    .search-input {
      flex: 1 1 240px;
      padding: 8px 12px;
      border: 1px solid var(--card-border);
      border-radius: 6px;
      font-size: 0.85rem;
      font-family: var(--font-main);
      outline: none;
    }
    .search-input:focus {
      border-color: var(--accent-blue);
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
    }
    .filter-btn {
      padding: 7px 12px;
      border: 1px solid var(--card-border);
      background: #ffffff;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .filter-btn:hover { background: #f1f5f9; color: var(--text-main); }
    .filter-btn.active {
      background: var(--accent-blue);
      border-color: var(--accent-blue);
      color: #ffffff;
    }

    /* Accordion / Inspector Row */
    .case-row {
      border: 1px solid var(--card-border);
      border-radius: 8px;
      margin-bottom: 0.6rem;
      background: #ffffff;
      transition: box-shadow 0.15s ease;
    }
    .case-row:hover {
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.05);
    }
    .case-summary {
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .case-q-text {
      flex: 1 1 300px;
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--text-main);
    }
    .case-details {
      display: none;
      padding: 1rem 1.25rem 1.25rem;
      border-top: 1px solid #f1f5f9;
      background: #fbfcfe;
      border-bottom-left-radius: 8px;
      border-bottom-right-radius: 8px;
      font-size: 0.85rem;
    }
    .case-details.open { display: block; }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
      margin-bottom: 0.75rem;
    }
    .detail-box {
      background: #ffffff;
      border: 1px solid var(--card-border);
      border-radius: 6px;
      padding: 0.75rem 1rem;
    }
    .detail-title {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 0.4rem;
    }
    .answer-preview {
      max-height: 180px;
      overflow-y: auto;
      font-size: 0.82rem;
      line-height: 1.5;
      color: #334155;
      background: #f8fafc;
      padding: 0.6rem;
      border-radius: 4px;
      white-space: pre-wrap;
      font-family: var(--font-mono);
    }

    /* Screenshots Grid */
    .screenshots-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.25rem;
      margin-top: 1rem;
    }
    .screen-card {
      border: 1px solid var(--card-border);
      border-radius: 8px;
      overflow: hidden;
      background: #ffffff;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .screen-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
      border-color: var(--accent-blue);
    }
    .screen-thumb {
      aspect-ratio: 16 / 10;
      background: #000;
      overflow: hidden;
    }
    .screen-thumb img {
      width: 100%; height: 100%; object-fit: cover; object-position: top;
      transition: transform 0.2s ease;
    }
    .screen-card:hover img { transform: scale(1.02); }
    .screen-caption {
      padding: 0.85rem 1rem;
    }
    .screen-title { font-weight: 700; font-size: 0.85rem; color: var(--text-main); margin-bottom: 0.2rem; }
    .screen-desc { font-size: 0.78rem; color: var(--text-muted); line-height: 1.4; }

    /* Evaluation Rubric & Sign-off */
    .rubric-box {
      border: 2px dashed #cbd5e1;
      border-radius: 10px;
      padding: 1.5rem;
      background: #fbfcfe;
      margin-top: 2rem;
    }
    .sign-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-top: 2.5rem;
      text-align: center;
    }
    .sign-title { font-weight: 700; font-size: 0.88rem; color: var(--text-main); }
    .sign-space { height: 60px; }
    .sign-sub { font-size: 0.8rem; color: var(--text-muted); font-style: italic; }

    /* Modal */
    .zoom-modal {
      display: none;
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(4px);
      z-index: 9999;
      justify-content: center;
      align-items: center;
      padding: 1.5rem;
    }
    .zoom-modal img {
      max-width: 95%; max-height: 90vh;
      border-radius: 8px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }

    @media print {
      body { background: #ffffff; padding: 0; }
      .top-banner { background: #ffffff; color: #000; padding: 1rem 0; border: none; }
      .banner-title { color: #000; }
      .banner-subtitle { color: #555; }
      .inspector-controls, .zoom-modal { display: none !important; }
      .content-section { border: 1px solid #ccc; box-shadow: none; page-break-inside: avoid; }
    }
  `;
}
