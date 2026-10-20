import { useEffect, useRef, useState, type FormEvent } from 'react'
import { SignInButton, useAuth } from '@proappstore/sdk'
import { app, batch, accessLost, errorText, query, type Workspace } from './api'
import { ChannelShell } from './Channels'
import { NavigationContext, useNavigation, type MobileView } from './navigation'
import { OwnProfile } from './Members'

// Navigation decisions (E25/E32):
// - Mobile tabs are ephemeral; authorized channel selection opens conversation.
//   URL deep links and persistent private drafts are outside this slice.
// - Top-bar back handles intra-app navigation. Browser/OS back retains native
//   behavior, which varies by browser and standalone host.
// - Tabs retain mounted drafts; channel/workspace/access changes discard them.
// - Reflow uses rem and dvh; enlarged-text checks live in Playwright.
export default function App() {
  const [mobileView, setMobileView] = useState<MobileView>('channels')
  const [context, setContext] = useState({ workspace: '', channel: '' })
  return <NavigationContext.Provider value={{ mobileView, setMobileView, context, setContext }}><AppShell /></NavigationContext.Provider>
}

function AppShell() {
  const { user, loading, signOut } = useAuth(app)
  const authError = app.auth.authError
  const { mobileView, setMobileView, context } = useNavigation()
  const [profileOpen, setProfileOpen] = useState(false)
  return <div className="slackie-shell app-shell" data-mobile-view={mobileView}>
    <a href="#conversation" className="skip-link" onClick={() => setMobileView('conversation')}>Skip to conversation</a>
    <header className="top-bar">
      {user && mobileView !== 'channels' && <button className="mobile-back" aria-label="Back" onClick={() => setMobileView(mobileView === 'thread' ? 'conversation' : 'channels')}>&larr;</button>}
      <div className="top-title"><h1>Slackie</h1>{user && <p>{context.workspace}{context.channel && ' / #' + context.channel}{mobileView === 'thread' && ' / Thread'}</p>}</div>
      {user && <><button className="avatar-button" aria-label="Open your profile" onClick={() => setProfileOpen(true)}>{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span aria-hidden="true">{user.login?.slice(0, 1).toUpperCase() || 'You'}</span>}</button><button onClick={signOut}>Sign out</button></>}
    </header>
    <div className="scroll-area">
    {loading ? <p role="status">Checking your session…</p> : user ? <WorkspaceShell key={user.id} profileOpen={profileOpen} onProfileClose={() => setProfileOpen(false)} />
      : <main id="conversation"><h2>Team conversations, together.</h2>
        <p>Sign in or create your account to open your workspaces.</p>
        {authError && <p role="alert">Sign-in could not be completed. Please try again. If this continues, report this code: {authError}</p>}
        <div className="signin-actions"><SignInButton app={app} provider="google" label="Sign in with Google" />{' '}
        <SignInButton app={app} provider="github" label="Sign in with GitHub" /></div></main>}
    </div>
    {user && <nav className="bottom-bar" aria-label="Mobile navigation">{(['channels', 'conversation', 'thread'] as const).map((tab, index) => <button key={tab} aria-current={mobileView === tab ? 'page' : undefined} onClick={() => { setMobileView(tab); window.dispatchEvent(new Event('slackie:navigate')) }}><span aria-hidden="true">{['\u2637', '\u25a4', '\u21b3'][index]}</span>{['Channels', 'Conversation', 'Threads'][index]}</button>)}</nav>}
  </div>
}

function WorkspaceShell({ profileOpen, onProfileClose }: { profileOpen: boolean; onProfileClose: () => void }) {
  const { setContext, setMobileView } = useNavigation()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selected, setSelected] = useState('')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const nameInvalid = name.length > 0 && !/^[a-z0-9_-]+$/.test(name)
  const nameHelp = 'Workspace name must be lowercase with no spaces. Use lowercase letters, numbers, underscores or hyphens, for example: my-team.'
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
    if (nameInvalid || !name) { event.preventDefault(); setError(nameHelp); return }
    event.preventDefault(); setBusy(true); setError('')
    try {
      const id = createId.current
      const changes = await batch('workspace_create', { workspace_id: id, name, slug })
      const rows = await query<Workspace>('workspace_list')
      if (!rows.some(row => row.id === id)) throw new Error(changes[0]
        ? 'Workspace was not created. Check the slug and retry.'
        : 'Workspace name must be lowercase with no spaces (letters, numbers, underscores or hyphens). Check that the slug is unique.')
      setWorkspaces(rows); setSelected(id); setName(''); setSlug(''); createId.current = crypto.randomUUID()
    } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  const workspace = workspaces.find(row => row.id === selected)
  useEffect(() => {
    setContext(current => ({ ...current, workspace: workspace?.name ?? '' }))
  }, [workspace?.name, setContext])
  useEffect(() => { setMobileView('channels') }, [workspace?.id, setMobileView])
  async function refreshWorkspaces() { setWorkspaces(await query<Workspace>('workspace_list')) }
  return <>
    <section aria-label="Workspaces" className="workspace-controls">
      <label>Workspace <select value={selected} disabled={loading || busy || !workspaces.length} onChange={event => setSelected(event.target.value)}>
        {!workspaces.length && <option value="">No workspaces yet</option>}
        {workspaces.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
      </select></label>
      <details><summary>Create a workspace</summary><form onSubmit={create} className="slackie-form">
        <label>Name <input required maxLength={100} pattern="[a-z0-9_-]+" title={nameHelp} value={name} onChange={event => setName(event.target.value)} aria-invalid={nameInvalid} aria-describedby="workspace-name-help" /></label>
        <small id="workspace-name-help" role={nameInvalid ? 'alert' : undefined}>{nameHelp}</small>
        <label>Slug <input required maxLength={80} pattern="[a-z0-9-]+" value={slug} onChange={event => setSlug(event.target.value)} aria-describedby="slug-help" /></label>
        <small id="slug-help">Lowercase letters, numbers, and hyphens.</small>
        <button aria-label="Create workspace" disabled={busy || loading || !name || nameInvalid}>{busy ? 'Creating…' : 'Create workspace'}</button>
      </form></details>
    </section>
    {profileOpen && <OwnProfile key={`profile:${selected}`} workspace={workspace} onClose={onProfileClose} />}
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">Loading workspaces…</p> : workspace ? <ChannelShell key={workspace.id} workspace={workspace} onWorkspaceChanged={refreshWorkspaces} />
      : <main id="conversation"><p>Create a workspace to get started.</p></main>}
  </>
}
