"use strict";

// Simple data provider for the dashboard
function dashboardData() {
  const now = new Date();
  return {
    title: "MVP Dashboard",
    stats: {
      users: 128,
      sessions: 342,
      uptimeHours: 73,
    },
    generatedAt: now.toISOString(),
  };
}

// Render dashboard HTML from data
function renderDashboard(model) {
  const { title, stats, generatedAt } = model;
  const style = `
    :root{--bg:#0f1115;--bg2:#131722;--surface:rgba(255,255,255,0.06);--border:rgba(255,255,255,0.12);--text:#e6e9ef;--muted:#9aa4b2}
    *{box-sizing:border-box}
    body{margin:0;padding:24px;font-family:ui-sans-serif, system-ui, Segoe UI, Roboto, Arial, sans-serif;color:var(--text);background:radial-gradient(1200px 800px at 10% -10%, #1a2031 0%, transparent 60%),radial-gradient(1000px 700px at 100% 0%, #1a1f2b 0%, transparent 55%),linear-gradient(180deg, var(--bg) 0%, var(--bg2) 100%)}
    header{margin-bottom:16px}
    h1{font-size:26px;margin:0 0 6px;letter-spacing:.2px}
    p{color:var(--muted);margin:0}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-top:14px}
    .card{border:1px solid var(--border);border-radius:14px;padding:16px;background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));box-shadow:0 10px 24px rgba(0,0,0,.25)}
    .kpi{font-weight:700;font-size:22px;margin-top:6px}
    .label{color:var(--muted);font-size:13px}
    footer{margin-top:20px;font-size:12px;color:var(--muted)}
  `;
  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(title)}</title>
      <style>${style}</style>
    </head>
    <body>
      <header>
        <h1>${escapeHtml(title)}</h1>
        <p>Quick KPIs of your application.</p>
      </header>
      <section class="grid">
        ${card("Active Users", stats.users)}
        ${card("Sessions", stats.sessions)}
        ${card("Uptime (h)", stats.uptimeHours)}
      </section>
      <footer>Generated at ${escapeHtml(generatedAt)}</footer>
    </body>
  </html>`;
}

function card(label, value) {
  return `<div class="card"><div class="label">${escapeHtml(label)}</div><div class="kpi">${escapeHtml(String(value))}</div></div>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = {
  dashboardData,
  renderDashboard,
};
