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
    body { font-family: system-ui, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; color: #222; }
    header { margin-bottom: 16px; }
    h1 { font-size: 22px; margin: 0 0 8px; }
    .cards { display: flex; gap: 12px; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; min-width: 140px; background: #fafafa; }
    .kpi { font-weight: 600; font-size: 18px; }
    footer { margin-top: 20px; font-size: 12px; color: #666; }
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
      <section class="cards">
        ${card("Active Users", stats.users)}
        ${card("Sessions", stats.sessions)}
        ${card("Uptime (h)", stats.uptimeHours)}
      </section>
      <footer>Generated at ${escapeHtml(generatedAt)}</footer>
    </body>
  </html>`;
}

function card(label, value) {
  return `<div class="card"><div>${escapeHtml(label)}</div><div class="kpi">${escapeHtml(String(value))}</div></div>`;
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

