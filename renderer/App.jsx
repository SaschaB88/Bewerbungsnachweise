import React, { useEffect, useState } from 'react'

export default function App() {
  const [stats, setStats] = useState({ applications: 0, contacts: 0, activities: 0 })
  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState(null)
  const [page, setPage] = useState('dashboard') // 'dashboard' | 'applications' | 'contacts' | 'actions'

  useEffect(() => {
    const api = window.api
    const refreshStats = async () => {
      if (api && api.getStats) {
        try { const s = await api.getStats(); setStats(s) } catch {}
      }
    }
    refreshStats()
    const onStatsChanged = () => { refreshStats() }
    window.addEventListener('statsChanged', onStatsChanged)
    return () => window.removeEventListener('statsChanged', onStatsChanged)
  }, [])

  return (
    <div className="container">
      <div className="layout">
        <aside className="sidebar">
          <div className="nav-title">Navigation</div>
          <nav className="nav">
            <button className={`nav-item ${page==='dashboard'?'active':''}`} onClick={async ()=>{ try { await window.api.focusWindow?.() } catch {} ; setPage('dashboard'); setTimeout(()=>window.dispatchEvent(new Event('hardFocusReset')),10)}}>Dashboard</button>
            <button className={`nav-item ${page==='applications'?'active':''}`} onClick={async ()=>{ try { await window.api.focusWindow?.() } catch {} ; setPage('applications'); setTimeout(()=>window.dispatchEvent(new Event('hardFocusReset')),10)}}>Deine Bewerbungen</button>
            <button className={`nav-item ${page==='contacts'?'active':''}`} onClick={()=>setPage('contacts')}>Kontakte</button>
            <button className={`nav-item ${page==='actions'?'active':''}`} onClick={()=>setPage('actions')}>Aktionen</button>
          </nav>
        </aside>
        <main className="content">
          {page === 'dashboard' && (
            <DashboardView
              stats={stats}
              showForm={showForm}
              setShowForm={setShowForm}
              notice={notice}
              onCreated={async () => {
                setShowForm(false)
                setNotice('Bewerbung erfolgreich erstellt')
                setTimeout(() => setNotice(null), 2500)
                const api = window.api
                if (api && api.getStats) {
                  const s = await api.getStats()
                  setStats(s)
                }
                // notify other views
                window.dispatchEvent(new Event('statsChanged'))
              }}
              onGoToApplications={() => setPage('applications')}
            />
          )}
          {page === 'applications' && (
            <ApplicationsPage onBack={() => setPage('dashboard')} />
          )}
          {page === 'contacts' && (
            <ContactsPage />
          )}
          {page === 'actions' && (
            <ActionsPage />
          )}
        </main>
      </div>
    </div>
  )
}

function Card({ label, value }) {
  return (
    <div className="card">
      <div className="kpi-label">{label}</div>
      <div className="kpi">{String(value)}</div>
    </div>
  )
}

function DashboardView({ stats, showForm, setShowForm, notice, onCreated, onGoToApplications }) {
  return (
    <>
      <header>
        <h1>Dein Dashboard</h1>
        <p>Deine Leistungskennzahlen:</p>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>{showForm ? 'Schließen' : 'Bewerbung eintragen'}</button>
          <button className="btn btn-ghost" onClick={onGoToApplications}>Bewerbungen anzeigen</button>
        </div>
        {notice && <p className="notice">{notice}</p>}
      </header>
      <section className="kpi-grid">
        <Card label="Bewerbungen" value={stats.applications} />
        <Card label="Kontakte" value={stats.contacts} />
        <Card label="Aktivitäten" value={stats.activities} />
      </section>
      {showForm && (
        <section style={{ marginTop: 20 }}>
          <div className="panel">
            <AddApplicationForm onCreated={onCreated} />
          </div>
        </section>
      )}
    </>
  )
}

function ApplicationsPage({ onBack }) {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [confirmItem, setConfirmItem] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const rows = await (window.api?.listApplications?.() || Promise.resolve([]))
        if (mounted) setApps(rows)
      } catch (e) {
        if (mounted) setError(e?.message || String(e))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <div>
      <header>
        <h1>Deine Bewerbungen</h1>
        <p>Alle Bewerbungen in deiner Datenbank.</p>
        <div className="actions">
          <button className="btn btn-primary" onClick={async () => {
            try { await window.api.focusWindow?.() } catch {}
            setShowForm(v => !v)
            setTimeout(() => { window.dispatchEvent(new Event('hardFocusReset')) }, 10)
          }}>{showForm ? 'Schließen' : 'Bewerbung eintragen'}</button>
          <button className="btn btn-ghost" onClick={onBack}>Zurück zum Dashboard</button>
        </div>
      </header>
      {notice && <p className="notice">{notice}</p>}
      {showForm && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <AddApplicationForm onCreated={async () => {
            setShowForm(false)
            setNotice('Bewerbung erfolgreich erstellt')
            setTimeout(() => setNotice(null), 2500)
            try {
              const rows = await (window.api?.listApplications?.() || Promise.resolve([]))
              setApps(rows)
            } catch {}
          }} />
        </div>
      )}
  {loading && <p>Lade…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {!loading && !error && (
        apps.length === 0 ? (
          <p>Keine Bewerbungen vorhanden.</p>
        ) : (
          <div className="panel">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Unternehmen</th>
                  <th>Rolle</th>
                  <th>Status</th>
                  <th>URL</th>
                  <th>Erstellt</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {apps.map(a => {
                  const statusKey = String(a.status || '').replace(' ', '-')
                  const clickable = !showForm && !editItem
                  const rowProps = clickable ? {
                    className: 'row-clickable',
                    onClick: (e) => {
                      const tag = e.target.tagName.toLowerCase()
                      if (tag === 'button' || tag === 'a' || e.target.closest('button') || e.target.closest('a')) return
                      window.api.openApplicationWindow(a.id)
                    }
                  } : {}
                  return (
                    <tr key={a.id} {...rowProps}>
                      <td>{a.id}</td>
                      <td>{a.company}</td>
                      <td>{a.role || ''}</td>
                      <td><span className={`badge status-${statusKey}`}>{a.status}</span></td>
                      <td>
                        {a.url ? <a className="link" href={a.url} target="_blank" rel="noreferrer">Link</a> : ''}
                      </td>
                      <td>{new Date(a.created_at).toLocaleString()}</td>
                      <td>
                        <div className="actions">
                          <button
                            className="btn"
                            onClick={(e) => { e.stopPropagation(); setEditItem(a); }}
                          >Bearbeiten</button>
                          <button
                            className="btn btn-danger"
                            onClick={(e) => { e.stopPropagation(); setConfirmItem(a) }}
                          >Löschen</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}
      {editItem && (
        <div className="panel" style={{ marginTop: 16 }}>
          <EditApplicationForm
            item={editItem}
            onCancel={() => setEditItem(null)}
            onSaved={async () => {
              setEditItem(null)
              setNotice('Bewerbung aktualisiert')
              setTimeout(() => setNotice(null), 2500)
              try {
                const rows = await (window.api?.listApplications?.() || Promise.resolve([]))
                setApps(rows)
              } catch {}
            }}
          />
        </div>
      )}

      {confirmItem && (
        <div className="modal-backdrop" onClick={() => setConfirmItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2>Eintrag löschen?</h2>
            <p>Möchtest du die Bewerbung “{confirmItem.company}” wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmItem(null)}>Abbrechen</button>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  try {
                    await window.api.deleteApplication(confirmItem.id)
                    setConfirmItem(null)
                    setApps(prev => prev.filter(x => x.id !== confirmItem.id))
                    setNotice('Bewerbung gelöscht')
                    setTimeout(() => setNotice(null), 2000)
                    // Notify dashboard to refresh KPIs
                    try { window.dispatchEvent(new Event('statsChanged')) } catch {}
                    // Reset focus state after deletion
                    try { document.activeElement && document.activeElement.blur() } catch {}
                    try { await window.api.focusWindow?.() } catch {}
                    setTimeout(() => { window.dispatchEvent(new Event('hardFocusReset')) }, 10)
                  } catch (e) {
                    setError(e?.message || String(e))
                  }
                }}
              >Löschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ContactsPage() {
  return (
    <div>
      <header>
        <h1>Kontakte</h1>
        <p>Verwalte Kontakte zu deinen Bewerbungen.</p>
      </header>
      <div className="panel">
        <p>Diese Ansicht ist noch leer. Demnächst kannst du hier Kontakte hinzufügen und verwalten.</p>
      </div>
    </div>
  )
}

function ActionsPage() {
  return (
    <div>
      <header>
        <h1>Aktionen</h1>
        <p>Schnellzugriffe und nützliche Aktionen.</p>
      </header>
      <div className="panel">
        <p>Diese Ansicht ist noch leer. Hier könnten Batch-Operationen, Exporte und weitere Tools erscheinen.</p>
      </div>
    </div>
  )
}

function AddApplicationForm({ onCreated }) {
  const [allowed, setAllowed] = useState([
    'Geplant','Beworben','Vorstellungsgespräch','Angebot','Eingestellt','Abgelehnt','Zurückgestellt'
  ])
  const [form, setForm] = useState({
    company: '',
    role: '',
    status: 'Geplant',
    url: '',
    notes: ''
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const companyRef = React.useRef(null)

  function isValidHttpUrl(u) {
    if (!u) return false
    try {
      const parsed = new URL(u)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch { return false }
  }

  useEffect(() => {
    const api = window.api
    if (api && api.getAllowedStatuses) {
      api.getAllowedStatuses().then(setAllowed).catch(() => {})
    }
    // Autofocus company on mount
    setTimeout(() => { try { companyRef.current?.focus() } catch {} }, 0)
    const onHardFocus = () => { try { companyRef.current?.focus() } catch {} }
    window.addEventListener('hardFocusReset', onHardFocus)
    return () => window.removeEventListener('hardFocusReset', onHardFocus)
  }, [])

  function onChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!form.company.trim()) {
      setError("Unternehmen ist erforderlich")
      return
    }
    if (!allowed.includes(form.status)) {
      setError("Ungültiger Status ausgewählt")
      return
    }
    if (form.url && form.url.trim() && !isValidHttpUrl(form.url.trim())) {
      setError("Bitte eine gültige URL angeben (http/https)")
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
      try { window.dispatchEvent(new Event('statsChanged')) } catch {}
      setForm({ company: '', role: '', status: 'Geplant', url: '', notes: '' })
      onCreated && onCreated()
    } catch (err) {
      setError(err?.message || String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="panel-header">
        <h2 className="panel-title">Neue Bewerbung</h2>
        <p className="panel-subtitle">Gib Details ein, um eine Bewerbung hinzuzufügen.</p>
      </div>
      <div className="form-grid">
        <div className="form-row">
          <label>Unternehmen*:</label>
          <input ref={companyRef} placeholder="z. B. OpenAI" name="company" value={form.company} onChange={onChange} required />
        </div>
        <div className="form-row">
          <label>Rolle*:</label>
          <input placeholder="z. B. Software Engineer" name="role" value={form.role} onChange={onChange} required />
        </div>
        <div className="form-row">
          <label>Status*:</label>
          <select name="status" value={form.status} onChange={onChange} required>
            {allowed.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>URL:</label>
          <input type="url" placeholder="https://..." name="url" value={form.url} onChange={onChange} pattern="https?://.*" title="Gültige URL beginnend mit http:// oder https://" />
        </div>
        <div className="form-row full">
          <label>Notizen:</label>
          <textarea placeholder="Optionale Notizen" name="notes" value={form.notes} onChange={onChange} rows={4} />
        </div>
      </div>
      <div className="form-actions">
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? 'Speichert…' : 'Bewerbung speichern'}</button>
      </div>
    </form>
  )
}

function EditApplicationForm({ item, onCancel, onSaved }) {
  const [allowed, setAllowed] = useState([
    'Geplant','Beworben','Vorstellungsgespräch','Angebot','Eingestellt','Abgelehnt','Zurückgestellt'
  ])
  const [form, setForm] = useState({
    company: item.company || '',
    role: item.role || '',
    status: item.status || 'Geplant',
    url: item.url || '',
    notes: item.notes || ''
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const companyRef = React.useRef(null)

  function isValidHttpUrl(u) {
    if (!u) return false
    try {
      const parsed = new URL(u)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch { return false }
  }

  useEffect(() => {
    const api = window.api
    if (api && api.getAllowedStatuses) {
      api.getAllowedStatuses().then(setAllowed).catch(() => {})
    }
    setTimeout(() => { try { companyRef.current?.focus() } catch {} }, 0)
    const onHardFocus = () => { try { companyRef.current?.focus() } catch {} }
    window.addEventListener('hardFocusReset', onHardFocus)
    return () => window.removeEventListener('hardFocusReset', onHardFocus)
  }, [])

  function onChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!form.company.trim()) {
      setError("Unternehmen ist erforderlich")
      return
    }
    if (!allowed.includes(form.status)) {
      setError("Ungültiger Status ausgewählt")
      return
    }
    if (form.url && form.url.trim() && !isValidHttpUrl(form.url.trim())) {
      setError("Bitte eine gültige URL angeben (http/https)")
      return
    }
    try {
      setSubmitting(true)
      await window.api.updateApplication({
        id: item.id,
        company: form.company,
        role: form.role || undefined,
        status: form.status,
        url: form.url || undefined,
        notes: form.notes || undefined,
      })
      try { window.dispatchEvent(new Event('statsChanged')) } catch {}
      onSaved && onSaved()
    } catch (err) {
      setError(err?.message || String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="panel-header">
        <h2 className="panel-title">Bewerbung bearbeiten</h2>
        <p className="panel-subtitle">Felder aktualisieren und Änderungen speichern.</p>
      </div>
      <div className="form-grid">
        <div className="form-row">
          <label>Unternehmen*:</label>
          <input ref={companyRef} name="company" value={form.company} onChange={onChange} required />
        </div>
        <div className="form-row">
          <label>Rolle*:</label>
          <input name="role" value={form.role} onChange={onChange} required />
        </div>
        <div className="form-row">
          <label>Status*:</label>
          <select name="status" value={form.status} onChange={onChange} required>
            {allowed.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>URL:</label>
          <input name="url" value={form.url} onChange={onChange} />
        </div>
        <div className="form-row full">
          <label>Notizen:</label>
          <textarea name="notes" value={form.notes} onChange={onChange} rows={4} />
        </div>
      </div>
      <div className="form-actions">
        {error && <div className="form-error">{error}</div>}
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={submitting}>Abbrechen</button>
        <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? 'Speichert…' : 'Änderungen speichern'}</button>
      </div>
    </form>
  )
}
