import { useEffect, useRef, useState, type FormEvent } from 'react'
import { SignInButton, useAuth } from '@proappstore/sdk'
import { app, batch, accessLost, errorText, query, type Workspace } from './api'
import { ChannelShell } from './Channels'

export default function App() {
  const { user, loading, signOut } = useAuth(app)
  const authError = app.auth.authError
  return <div className="slackie-shell">
    <a href="#conversation" className="skip-link">Skip to conversation</a>
    <header className="slackie-header"><h1>Slackie</h1>{user && <button onClick={signOut}>Sign out</button>}</header>
    {loading ? <p role="status">Checking your session…</p> : user ? <WorkspaceShell key={user.id} />
      : <main id="conversation"><h2>Team conversations, together.</h2>
        <p>Sign in or create your account to open your workspaces.</p>
        {authError && <p role="alert">Sign-in could not be completed. Please try again. If this continues, report this code: {authError}</p>}
        <SignInButton app={app} provider="google" label="Sign in with Google" />{' '}
        <SignInButton app={app} provider="github" label="Sign in with GitHub" /></main>}
  </div>
}

function WorkspaceShell() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selected, setSelected] = useState('')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const createId = useRef(crypto.randomUUID())
  useEffect(() => {
    let active = true
    let pending = false
    async function load() {
      if (pending) return
      pending = true
      try {
        const rows = await query<Workspace>('workspace_list')
        if (active) {
          setWorkspaces(rows)
          setError('')
          setSelected(current => rows.some(row => row.id === current) ? current : rows[0]?.id ?? '')
        }
      } catch (err) { if (active) { if (accessLost(err)) { setWorkspaces([]); setSelected('') }; setError(errorText(err)) } }
      finally { pending = false; if (active) setLoading(false) }
    }
    void load()
    const timer = window.setInterval(() => void load(), 10000)
    const focus = () => void load()
    window.addEventListener('focus', focus)
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', focus) }
  }, [])
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const id = createId.current
      await batch('workspace_create', { workspace_id: id, name: name.trim(), slug })
      const rows = await query<Workspace>('workspace_list')
      if (!rows.some(row => row.id === id)) throw new Error('Workspace was not created. Check the slug and retry.')
      setWorkspaces(rows); setSelected(id); setName(''); setSlug(''); createId.current = crypto.randomUUID()
    } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  const workspace = workspaces.find(row => row.id === selected)
  async function refreshWorkspaces() { setWorkspaces(await query<Workspace>('workspace_list')) }
  return <>
    <section aria-label="Workspaces" className="workspace-controls">
      <label>Workspace <select value={selected} disabled={loading || busy || !workspaces.length} onChange={event => setSelected(event.target.value)}>
        {!workspaces.length && <option value="">No workspaces yet</option>}
        {workspaces.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
      </select></label>
      <details><summary>Create a workspace</summary><form onSubmit={create} className="slackie-form">
        <label>Name <input required maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label>
        <label>Slug <input required maxLength={80} pattern="[a-z0-9-]+" value={slug} onChange={event => setSlug(event.target.value)} aria-describedby="slug-help" /></label>
        <small id="slug-help">Lowercase letters, numbers, and hyphens.</small>
        <button aria-label="Create workspace" disabled={busy || loading}>{busy ? 'Creating…' : 'Create workspace'}</button>
      </form></details>
    </section>
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">Loading workspaces…</p> : workspace ? <ChannelShell key={workspace.id} workspace={workspace} onWorkspaceChanged={refreshWorkspaces} />
      : <main id="conversation"><p>Create a workspace to get started.</p></main>}
  </>
}
