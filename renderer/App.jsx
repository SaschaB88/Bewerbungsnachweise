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
  const [contacts, setContacts] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [confirmItem, setConfirmItem] = useState(null)

  const mountedRef = React.useRef(true)

  const load = React.useCallback(async (withSpinner = false) => {
    if (withSpinner) setLoading(true)
    if (mountedRef.current) setError(null)
    try {
      const contactPromise = window.api?.listContacts?.() || Promise.resolve([])
      const appPromise = window.api?.listApplications?.() || Promise.resolve([])
      const [contactRows, appRows] = await Promise.all([contactPromise, appPromise])
      if (!mountedRef.current) return
      setContacts(contactRows)
      setApplications(appRows)
    } catch (err) {
      if (mountedRef.current) setError(err?.message || String(err))
    } finally {
      if (withSpinner && mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(true)
    const onStatsChanged = () => { load(false) }
    window.addEventListener('statsChanged', onStatsChanged)
    return () => {
      mountedRef.current = false
      window.removeEventListener('statsChanged', onStatsChanged)
    }
  }, [load])

  const hasApplications = applications.length > 0

  return (
    <div>
      <header>
        <h1>Kontakte</h1>
        <p>Verwalte Ansprechpartner zu deinen Bewerbungen.</p>
        <div className="actions">
          <button
            className="btn btn-primary"
            disabled={!hasApplications && !showForm}
            onClick={async () => {
              if (!hasApplications && !showForm) return
              try { await window.api.focusWindow?.() } catch {}
              setEditItem(null)
              setShowForm(v => !v)
              setTimeout(() => { window.dispatchEvent(new Event('hardFocusReset')) }, 10)
            }}
          >{showForm ? 'Schliessen' : 'Kontakt hinzufuegen'}</button>
        </div>
        {!hasApplications && (
          <p className="notice" style={{ marginTop: 12 }}>Lege zuerst eine Bewerbung an, um Kontakte zu erfassen.</p>
        )}
      </header>
      {notice && <p className="notice">{notice}</p>}
      {showForm && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <AddContactForm
            applications={applications}
            onCreated={async () => {
              setShowForm(false)
              setNotice('Kontakt gespeichert')
              setTimeout(() => setNotice(null), 2500)
              await load(false)
              try { window.dispatchEvent(new Event('statsChanged')) } catch {}
            }}
          />
        </div>
      )}
      {loading && <p>Laedt...</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {!loading && !error && (
        contacts.length === 0 ? (
          <p>Keine Kontakte gespeichert.</p>
        ) : (
          <div className="panel">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Unternehmen</th>
                  <th>Position</th>
                  <th>Email</th>
                  <th>Telefon</th>
                  <th>LinkedIn</th>
                  <th>Erstellt</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => {
                  const companyLabel = c.application_company
                    ? (c.application_role ? `${c.application_company} (${c.application_role})` : c.application_company)
                    : '-'
                  return (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{companyLabel}</td>
                      <td>{c.title || ''}</td>
                      <td>
                        {c.email ? (
                          <a className="link" href={`mailto:${c.email}`}>{c.email}</a>
                        ) : ''}
                      </td>
                      <td>{c.phone || ''}</td>
                      <td>
                        {c.linkedin ? (
                          <a className="link" href={c.linkedin} target="_blank" rel="noreferrer">Profil</a>
                        ) : ''}
                      </td>
                      <td>{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</td>
                      <td>
                        <div className="actions">
                          <button
                            className="btn"
                            onClick={() => {
                              setShowForm(false)
                              setEditItem(c)
                              setTimeout(() => { window.dispatchEvent(new Event('hardFocusReset')) }, 10)
                            }}
                          >Bearbeiten</button>
                          <button
                            className="btn btn-danger"
                            onClick={() => setConfirmItem(c)}
                          >Loeschen</button>
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
          <EditContactForm
            applications={applications}
            item={editItem}
            onCancel={() => setEditItem(null)}
            onSaved={async () => {
              setEditItem(null)
              setNotice('Kontakt aktualisiert')
              setTimeout(() => setNotice(null), 2500)
              await load(false)
              try { window.dispatchEvent(new Event('statsChanged')) } catch {}
            }}
          />
        </div>
      )}
      {confirmItem && (
        <div className="modal-backdrop" onClick={() => setConfirmItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2>Kontakt loeschen?</h2>
            <p>Moechtest du den Kontakt "{confirmItem.name}" wirklich loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmItem(null)}>Abbrechen</button>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  try {
                    await window.api.deleteContact(confirmItem.id)
                    setConfirmItem(null)
                    setContacts(prev => prev.filter(x => x.id !== confirmItem.id))
                    setNotice('Kontakt geloescht')
                    setTimeout(() => setNotice(null), 2000)
                    try { window.dispatchEvent(new Event('statsChanged')) } catch {}
                    await load(false)
                    try { await window.api.focusWindow?.() } catch {}
                    try { document.activeElement && document.activeElement.blur() } catch {}
                  } catch (e) {
                    setError(e?.message || String(e))
                  }
                }}
              >Loeschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AddContactForm({ applications, onCreated }) {
  const [form, setForm] = useState({
    applicationId: applications.length ? String(applications[0].id) : '',
    name: '',
    title: '',
    email: '',
    phone: '',
    linkedin: '',
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const nameRef = React.useRef(null)

  function isValidHttpUrl(u) {
    if (!u) return false
    try {
      const parsed = new URL(u)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch { return false }
  }

  useEffect(() => {
    setTimeout(() => { try { nameRef.current?.focus() } catch {} }, 0)
    const onHardFocus = () => { try { nameRef.current?.focus() } catch {} }
    window.addEventListener('hardFocusReset', onHardFocus)
    return () => window.removeEventListener('hardFocusReset', onHardFocus)
  }, [])

  useEffect(() => {
    if (!applications.length) return
    setForm(prev => {
      if (prev.applicationId) return prev
      return { ...prev, applicationId: String(applications[0].id) }
    })
  }, [applications])

  function onChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!applications.length) {
      setError('Bitte zuerst eine Bewerbung anlegen')
      return
    }
    if (!form.applicationId) {
      setError('Bitte eine Bewerbung auswaehlen')
      return
    }
    const trimmedName = form.name.trim()
    if (!trimmedName) {
      setError('Name ist erforderlich')
      return
    }
    const trimmedLinked = form.linkedin.trim()
    if (trimmedLinked && !isValidHttpUrl(trimmedLinked)) {
      setError('LinkedIn muss eine gueltige URL sein')
      return
    }
    try {
      setSubmitting(true)
      await window.api.createContact({
        applicationId: Number(form.applicationId),
        name: trimmedName,
        title: form.title.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        linkedin: trimmedLinked || undefined,
      })
      setForm(prev => ({
        ...prev,
        name: '',
        title: '',
        email: '',
        phone: '',
        linkedin: '',
      }))
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
        <h2 className="panel-title">Neuer Kontakt</h2>
        <p className="panel-subtitle">Lege eine Ansprechperson fuer eine Bewerbung an.</p>
      </div>
      <div className="form-grid">
        <div className="form-row full">
          <label>Bewerbung*:</label>
          <select
            name="applicationId"
            value={form.applicationId}
            onChange={onChange}
            disabled={!applications.length}
            required
          >
            <option value="">Bitte auswaehlen</option>
            {applications.map(app => (
              <option key={app.id} value={app.id}>{app.company}{app.role ? ` (${app.role})` : ''}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label>Name*:</label>
          <input
            ref={nameRef}
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="z. B. Alex Doe"
            required
          />
        </div>
        <div className="form-row">
          <label>Position:</label>
          <input
            name="title"
            value={form.title}
            onChange={onChange}
            placeholder="z. B. Recruiter"
          />
        </div>
        <div className="form-row">
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            placeholder="alex@example.com"
          />
        </div>
        <div className="form-row">
          <label>Telefon:</label>
          <input
            name="phone"
            value={form.phone}
            onChange={onChange}
            placeholder="+49 ..."
          />
        </div>
        <div className="form-row full">
          <label>LinkedIn:</label>
          <input
            name="linkedin"
            value={form.linkedin}
            onChange={onChange}
            placeholder="https://www.linkedin.com/in/..."
          />
        </div>
      </div>
      <div className="form-actions">
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={submitting || !applications.length}>
          {submitting ? 'Speichert...' : 'Kontakt speichern'}
        </button>
      </div>
    </form>
  )
}

function EditContactForm({ applications, item, onCancel, onSaved }) {
  const [form, setForm] = useState({
    applicationId: item.application_id ? String(item.application_id) : '',
    name: item.name || '',
    title: item.title || '',
    email: item.email || '',
    phone: item.phone || '',
    linkedin: item.linkedin || '',
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const nameRef = React.useRef(null)

  function isValidHttpUrl(u) {
    if (!u) return false
    try {
      const parsed = new URL(u)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch { return false }
  }

  useEffect(() => {
    setTimeout(() => { try { nameRef.current?.focus() } catch {} }, 0)
    const onHardFocus = () => { try { nameRef.current?.focus() } catch {} }
    window.addEventListener('hardFocusReset', onHardFocus)
    return () => window.removeEventListener('hardFocusReset', onHardFocus)
  }, [])

  useEffect(() => {
    setForm({
      applicationId: item.application_id ? String(item.application_id) : '',
      name: item.name || '',
      title: item.title || '',
      email: item.email || '',
      phone: item.phone || '',
      linkedin: item.linkedin || '',
    })
  }, [item])

  function onChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!form.applicationId) {
      setError('Bitte eine Bewerbung auswaehlen')
      return
    }
    const trimmedName = form.name.trim()
    if (!trimmedName) {
      setError('Name ist erforderlich')
      return
    }
    const trimmedLinked = form.linkedin.trim()
    if (trimmedLinked && !isValidHttpUrl(trimmedLinked)) {
      setError('LinkedIn muss eine gueltige URL sein')
      return
    }
    try {
      setSubmitting(true)
      await window.api.updateContact({
        id: item.id,
        applicationId: Number(form.applicationId),
        name: trimmedName,
        title: form.title.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        linkedin: trimmedLinked || undefined,
      })
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
        <h2 className="panel-title">Kontakt bearbeiten</h2>
        <p className="panel-subtitle">Aktualisiere die Daten der Kontaktperson.</p>
      </div>
      <div className="form-grid">
        <div className="form-row full">
          <label>Bewerbung*:</label>
          <select
            name="applicationId"
            value={form.applicationId}
            onChange={onChange}
            required
          >
            <option value="">Bitte auswaehlen</option>
            {applications.map(app => (
              <option key={app.id} value={app.id}>{app.company}{app.role ? ` (${app.role})` : ''}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label>Name*:</label>
          <input
            ref={nameRef}
            name="name"
            value={form.name}
            onChange={onChange}
            required
          />
        </div>
        <div className="form-row">
          <label>Position:</label>
          <input
            name="title"
            value={form.title}
            onChange={onChange}
          />
        </div>
        <div className="form-row">
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
          />
        </div>
        <div className="form-row">
          <label>Telefon:</label>
          <input
            name="phone"
            value={form.phone}
            onChange={onChange}
          />
        </div>
        <div className="form-row full">
          <label>LinkedIn:</label>
          <input
            name="linkedin"
            value={form.linkedin}
            onChange={onChange}
            placeholder="https://www.linkedin.com/in/..."
          />
        </div>
      </div>
      <div className="form-actions">
        {error && <div className="form-error">{error}</div>}
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={submitting}>Abbrechen</button>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Speichert...' : 'Kontakt speichern'}
        </button>
      </div>
    </form>
  )
}
function toDateTimeLocalValue(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = parsed.getFullYear();
  const month = pad(parsed.getMonth() + 1);
  const day = pad(parsed.getDate());
  const hours = pad(parsed.getHours());
  const minutes = pad(parsed.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function ActionsPage() {
  const [activities, setActivities] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirmItem, setConfirmItem] = useState(null);

  const mountedRef = React.useRef(true);

  const load = React.useCallback(async (withSpinner = false) => {
    if (withSpinner) setLoading(true);
    if (mountedRef.current) setError(null);
    try {
      const activityPromise = window.api?.listActivities?.() || Promise.resolve([]);
      const appPromise = window.api?.listApplications?.() || Promise.resolve([]);
      const [activityRows, appRows] = await Promise.all([activityPromise, appPromise]);
      if (!mountedRef.current) return;
      setActivities(activityRows);
      setApplications(appRows);
    } catch (err) {
      if (mountedRef.current) setError(err?.message || String(err));
    } finally {
      if (withSpinner && mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load(true);
    const onStatsChanged = () => { load(false); };
    window.addEventListener('statsChanged', onStatsChanged);
    return () => {
      mountedRef.current = false;
      window.removeEventListener('statsChanged', onStatsChanged);
    };
  }, [load]);

  const hasApplications = applications.length > 0;
  const rowClickable = !showForm && !editItem;

  return (
    <div>
      <header>
        <h1>Aktivitaeten</h1>
        <p>Verwalte Follow-ups, Gespraeche und weitere Aktionen.</p>
        <div className="actions">
          <button
            className="btn btn-primary"
            disabled={!hasApplications && !showForm}
            onClick={async () => {
              if (!hasApplications && !showForm) return;
              try { await window.api.focusWindow?.(); } catch {}
              setEditItem(null);
              setShowForm(v => !v);
              setTimeout(() => { window.dispatchEvent(new Event('hardFocusReset')); }, 10);
            }}
          >{showForm ? 'Schliessen' : 'Aktivitaet erfassen'}</button>
        </div>
        {!hasApplications && (
          <p className="notice" style={{ marginTop: 12 }}>Lege zuerst eine Bewerbung an, um Aktivitaeten zu erfassen.</p>
        )}
      </header>
      {notice && <p className="notice">{notice}</p>}
      {showForm && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <AddActivityForm
            applications={applications}
            onCreated={async () => {
              setShowForm(false);
              setNotice('Aktivitaet gespeichert');
              setTimeout(() => setNotice(null), 2500);
              await load(false);
              try { window.dispatchEvent(new Event('statsChanged')); } catch {}
            }}
          />
        </div>
      )}
      {loading && <p>Laedt...</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {!loading && !error && (
        activities.length === 0 ? (
          <p>Keine Aktivitaeten gespeichert.</p>
        ) : (
          <div className="panel">
            <table className="table">
              <thead>
                <tr>
                  <th>Typ</th>
                  <th>Bewerbung</th>
                  <th>Datum</th>
                  <th>Notizen</th>
                  <th>Erstellt</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {activities.map(act => {
                  const companyLabel = act.application_company
                    ? (act.application_role ? `${act.application_company} (${act.application_role})` : act.application_company)
                    : '-';
                  const formattedDate = act.date ? new Date(act.date).toLocaleString() : '';
                  const createdAt = act.created_at ? new Date(act.created_at).toLocaleString() : '';
                  const rowProps = rowClickable ? {
                    className: 'row-clickable',
                    onClick: (event) => {
                      const tag = event.target.tagName.toLowerCase();
                      if (tag === 'button' || event.target.closest('button') || event.target.closest('a')) return;
                      window.api.openApplicationWindow(act.application_id);
                    },
                  } : {};
                  return (
                    <tr key={act.id} {...rowProps}>
                      <td>{act.type}</td>
                      <td>{companyLabel}</td>
                      <td>{formattedDate}</td>
                      <td className="prewrap">{act.notes || ''}</td>
                      <td>{createdAt}</td>
                      <td>
                        <div className="actions">
                          <button
                            className="btn"
                            onClick={() => {
                              setShowForm(false);
                              setEditItem(act);
                              setTimeout(() => { window.dispatchEvent(new Event('hardFocusReset')); }, 10);
                            }}
                          >Bearbeiten</button>
                          <button
                            className="btn btn-danger"
                            onClick={() => setConfirmItem(act)}
                          >Loeschen</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
      {editItem && (
        <div className="panel" style={{ marginTop: 16 }}>
          <EditActivityForm
            applications={applications}
            item={editItem}
            onCancel={() => setEditItem(null)}
            onSaved={async () => {
              setEditItem(null);
              setNotice('Aktivitaet aktualisiert');
              setTimeout(() => setNotice(null), 2500);
              await load(false);
              try { window.dispatchEvent(new Event('statsChanged')); } catch {}
            }}
          />
        </div>
      )}
      {confirmItem && (
        <div className="modal-backdrop" onClick={() => setConfirmItem(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <h2>Aktivitaet loeschen?</h2>
            <p>Moechtest du die Aktivitaet "{confirmItem.type}" wirklich loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmItem(null)}>Abbrechen</button>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  try {
                    await window.api.deleteActivity(confirmItem.id);
                    setConfirmItem(null);
                    setActivities(prev => prev.filter(a => a.id !== confirmItem.id));
                    setNotice('Aktivitaet geloescht');
                    setTimeout(() => setNotice(null), 2000);
                    await load(false);
                    try { window.dispatchEvent(new Event('statsChanged')); } catch {}
                    try { await window.api.focusWindow?.(); } catch {}
                    try { document.activeElement && document.activeElement.blur(); } catch {}
                  } catch (err) {
                    setError(err?.message || String(err));
                  }
                }}
              >Loeschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddActivityForm({ applications, onCreated }) {
  const [form, setForm] = useState({
    applicationId: applications.length ? String(applications[0].id) : '',
    type: '',
    date: '',
    notes: '',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const typeRef = React.useRef(null);

  useEffect(() => {
    setTimeout(() => { try { typeRef.current?.focus(); } catch {} }, 0);
    const onHardFocus = () => { try { typeRef.current?.focus(); } catch {} };
    window.addEventListener('hardFocusReset', onHardFocus);
    return () => window.removeEventListener('hardFocusReset', onHardFocus);
  }, []);

  useEffect(() => {
    if (!applications.length) return;
    setForm(prev => {
      if (prev.applicationId) return prev;
      return { ...prev, applicationId: String(applications[0].id) };
    });
  }, [applications]);

  function onChange(event) {
    const { name, value } = event.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError(null);
    if (!applications.length) {
      setError('Bitte zuerst eine Bewerbung anlegen');
      return;
    }
    if (!form.applicationId) {
      setError('Bitte eine Bewerbung auswaehlen');
      return;
    }
    const type = form.type.trim();
    if (!type) {
      setError('Typ ist erforderlich');
      return;
    }
    const dateValue = form.date.trim();
    let isoDate = null;
    if (dateValue) {
      const parsed = new Date(dateValue);
      if (Number.isNaN(parsed.getTime())) {
        setError('Bitte gueltiges Datum angeben');
        return;
      }
      isoDate = parsed.toISOString();
    }
    const notes = form.notes.trim();
    try {
      setSubmitting(true);
      await window.api.createActivity({
        applicationId: Number(form.applicationId),
        type,
        date: isoDate || undefined,
        notes: notes || undefined,
      });
      setForm(prev => ({
        ...prev,
        type: '',
        date: '',
        notes: '',
      }));
      onCreated && onCreated();
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="panel-header">
        <h2 className="panel-title">Neue Aktivitaet</h2>
        <p className="panel-subtitle">Dokumentiere einen Schritt in deinem Bewerbungsprozess.</p>
      </div>
      <div className="form-grid">
        <div className="form-row full">
          <label>Bewerbung*:</label>
          <select
            name="applicationId"
            value={form.applicationId}
            onChange={onChange}
            disabled={!applications.length}
            required
          >
            <option value="">Bitte auswaehlen</option>
            {applications.map(app => (
              <option key={app.id} value={app.id}>{app.company}{app.role ? ` (${app.role})` : ''}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label>Typ*:</label>
          <input
            ref={typeRef}
            name="type"
            value={form.type}
            onChange={onChange}
            placeholder="z. B. Telefoninterview"
            required
          />
        </div>
        <div className="form-row">
          <label>Datum:</label>
          <input
            type="datetime-local"
            name="date"
            value={form.date}
            onChange={onChange}
          />
        </div>
        <div className="form-row full">
          <label>Notizen:</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={onChange}
            rows={4}
            placeholder="Optionale Notizen"
          />
        </div>
      </div>
      <div className="form-actions">
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={submitting || !applications.length}>
          {submitting ? 'Speichert...' : 'Aktivitaet speichern'}
        </button>
      </div>
    </form>
  );
}

function EditActivityForm({ applications, item, onCancel, onSaved }) {
  const [form, setForm] = useState({
    applicationId: item.application_id ? String(item.application_id) : '',
    type: item.type || '',
    date: toDateTimeLocalValue(item.date),
    notes: item.notes || '',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const typeRef = React.useRef(null);

  useEffect(() => {
    setTimeout(() => { try { typeRef.current?.focus(); } catch {} }, 0);
    const onHardFocus = () => { try { typeRef.current?.focus(); } catch {} };
    window.addEventListener('hardFocusReset', onHardFocus);
    return () => window.removeEventListener('hardFocusReset', onHardFocus);
  }, []);

  useEffect(() => {
    setForm({
      applicationId: item.application_id ? String(item.application_id) : '',
      type: item.type || '',
      date: toDateTimeLocalValue(item.date),
      notes: item.notes || '',
    });
  }, [item]);

  function onChange(event) {
    const { name, value } = event.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError(null);
    if (!form.applicationId) {
      setError('Bitte eine Bewerbung auswaehlen');
      return;
    }
    const type = form.type.trim();
    if (!type) {
      setError('Typ ist erforderlich');
      return;
    }
    const dateValue = form.date.trim();
    let isoDate = null;
    if (dateValue) {
      const parsed = new Date(dateValue);
      if (Number.isNaN(parsed.getTime())) {
        setError('Bitte gueltiges Datum angeben');
        return;
      }
      isoDate = parsed.toISOString();
    }
    const notes = form.notes.trim();
    const notesPayload = notes ? notes : null;
    try {
      setSubmitting(true);
      await window.api.updateActivity({
        id: item.id,
        applicationId: Number(form.applicationId),
        type,
        date: dateValue ? isoDate : null,
        notes: notesPayload,
      });
      onSaved && onSaved();
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="panel-header">
        <h2 className="panel-title">Aktivitaet bearbeiten</h2>
        <p className="panel-subtitle">Passe die Details deiner Aktivitaet an.</p>
      </div>
      <div className="form-grid">
        <div className="form-row full">
          <label>Bewerbung*:</label>
          <select
            name="applicationId"
            value={form.applicationId}
            onChange={onChange}
            required
          >
            <option value="">Bitte auswaehlen</option>
            {applications.map(app => (
              <option key={app.id} value={app.id}>{app.company}{app.role ? ` (${app.role})` : ''}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label>Typ*:</label>
          <input
            ref={typeRef}
            name="type"
            value={form.type}
            onChange={onChange}
            required
          />
        </div>
        <div className="form-row">
          <label>Datum:</label>
          <input
            type="datetime-local"
            name="date"
            value={form.date}
            onChange={onChange}
          />
        </div>
        <div className="form-row full">
          <label>Notizen:</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={onChange}
            rows={4}
          />
        </div>
      </div>
      <div className="form-actions">
        {error && <div className="form-error">{error}</div>}
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={submitting}>Abbrechen</button>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Speichert...' : 'Aktivitaet speichern'}
        </button>
      </div>
    </form>
  );
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

