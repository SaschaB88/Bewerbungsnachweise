import React, { useEffect, useState } from 'react'

export default function App() {
  const [stats, setStats] = useState({ applications: 0, contacts: 0, activities: 0 })

  useEffect(() => {
    const api = window.api
    if (api && api.getStats) {
      api.getStats().then(setStats).catch(() => {})
    }
  }, [])

  return (
    <div className="container">
      <header>
        <h1>Application Tracker Dashboard</h1>
        <p>Quick KPIs from the local SQLite database.</p>
      </header>
      <section className="cards">
        <Card label="Applications" value={stats.applications} />
        <Card label="Contacts" value={stats.contacts} />
        <Card label="Activities" value={stats.activities} />
      </section>
    </div>
  )
}

function Card({ label, value }) {
  return (
    <div className="card">
      <div>{label}</div>
      <div className="kpi">{String(value)}</div>
    </div>
  )
}

