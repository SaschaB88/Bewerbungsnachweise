import React, { useEffect, useState } from 'react'

export default function App() {
  const [stats, setStats] = useState({ applications: 0, contacts: 0, activities: 0 })
  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState(null)

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
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setShowForm(v => !v)}>{showForm ? 'Close' : 'Add New Application'}</button>
        </div>
        {notice && <p style={{ color: 'green' }}>{notice}</p>}
      </header>
      <section className="cards">
        <Card label="Applications" value={stats.applications} />
        <Card label="Contacts" value={stats.contacts} />
        <Card label="Activities" value={stats.activities} />
      </section>
      {showForm && (
        <section style={{ marginTop: 20 }}>
          <AddApplicationForm onCreated={async () => {
            setShowForm(false)
            setNotice('Application created successfully')
            setTimeout(() => setNotice(null), 2500)
            const api = window.api
            if (api && api.getStats) {
              const s = await api.getStats()
              setStats(s)
            }
          }} />
        </section>
      )}
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

function AddApplicationForm({ onCreated }) {
  const [allowed, setAllowed] = useState([
    'Planned','Applied','Interviewing','Offer','Hired','Rejected','On Hold'
  ])
  const [form, setForm] = useState({
    company: '',
    role: '',
    status: 'Planned',
    url: '',
    notes: ''
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const api = window.api
    if (api && api.getAllowedStatuses) {
      api.getAllowedStatuses().then(setAllowed).catch(() => {})
    }
  }, [])

  function onChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!form.company.trim()) {
      setError("Company is required")
      return
    }
    if (!allowed.includes(form.status)) {
      setError("Invalid status selected")
      return
    }
    try {
      setSubmitting(true)
      await window.api.createApplication({
        company: form.company,
        role: form.role || undefined,
        status: form.status,
        url: form.url || undefined,
        notes: form.notes || undefined,
      })
      setForm({ company: '', role: '', status: 'Planned', url: '', notes: '' })
      onCreated && onCreated()
    } catch (err) {
      setError(err?.message || String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8, background: '#fff' }}>
      <div style={{ marginBottom: 8 }}>
        <label>
          Company*
          <br />
          <input name="company" value={form.company} onChange={onChange} required />
        </label>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>
          Role
          <br />
          <input name="role" value={form.role} onChange={onChange} />
        </label>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>
          Status
          <br />
          <select name="status" value={form.status} onChange={onChange}>
            {allowed.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>
          URL
          <br />
          <input name="url" value={form.url} onChange={onChange} />
        </label>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>
          Notes
          <br />
          <textarea name="notes" value={form.notes} onChange={onChange} rows={3} />
        </label>
      </div>
      {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}
      <button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save Application'}</button>
    </form>
  )
}
