import { selectAuthorizedId } from './experience'
import { t } from './strings'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { SignInButton, useAuth } from '@proappstore/sdk'
import { app, batch, accessLost, errorText, query, type Workspace } from './api'
import { ChannelShell } from './Channels'
import { NavigationContext, useNavigation, useConversationSearch, openConversationLink, type MobileView } from './navigation'
import { ExperienceSettings } from './ExperienceProvider'
import { OwnProfile } from './Members'

// Navigation decisions (E25/E32):
// - Mobile tabs are ephemeral; authorized channel selection opens conversation.
//   URL links restore identifiers through authorized lists; drafts stay in memory.
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
  const shell = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    // iOS standalone can pan the visual viewport without resizing the layout
    // viewport. Keep both bars and the composer inside the visible rectangle.
    const sync = () => {
      if (viewport.scale !== 1) return // Preserve native pinch zoom.
      shell.current?.style.setProperty('--visible-height', `${viewport.height}px`)
      shell.current?.style.setProperty('--visible-top', `${viewport.offsetTop}px`)
    }
    sync()
    viewport.addEventListener('resize', sync)
    viewport.addEventListener('scroll', sync)
    return () => { viewport.removeEventListener('resize', sync); viewport.removeEventListener('scroll', sync) }
  }, [])
  return <div ref={shell} className="slackie-shell app-shell" data-mobile-view={mobileView}>
    <a href="#conversation" className="skip-link" onClick={() => setMobileView('conversation')}>{t("skipToConversation")}</a>
    <header className="top-bar">
      {user && mobileView !== 'channels' && <button className="mobile-back" aria-label={t("back")} onClick={() => setMobileView(mobileView === 'thread' ? 'conversation' : 'channels')}>{"\u2190"}</button>}
      <div className="top-title"><h1>{user ? (mobileView === 'channels' ? context.workspace || t("slackie") : mobileView === 'thread' ? t("thread") : context.channel ? `#${context.channel}` : t("conversation")) : t("slackie")}</h1>{user && <p>{context.workspace}{context.channel && ' / #' + context.channel}{mobileView === 'thread' && t("thread")}</p>}</div>
      {user && <><button className="avatar-button" aria-label={t("openYourProfile")} onClick={() => setProfileOpen(true)}>{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span aria-hidden="true">{user.login?.slice(0, 1).toUpperCase() || t("you")}</span>}</button><button aria-label={t("signOut")} onClick={signOut}>{t("signOut")}</button></>}
    </header>
    <div className="scroll-area">
    <div className="shell-preferences"><ExperienceSettings /></div>
    {loading ? <p role="status">{t("checkingYourSession")}</p> : user ? <WorkspaceShell key={user.id} profileOpen={profileOpen} onProfileClose={() => setProfileOpen(false)} />
      : <main id="conversation"><h2>{t("teamConversationsTogether")}</h2>
        <p>{t("signInOrCreateYourAccountToOpenYour")}</p>
        {authError && <p role="alert">{t("signInCouldNotBeCompletedPleaseTryAgain")} {authError}</p>}
        <div className="signin-actions"><SignInButton app={app} provider="google" label={t("signInWithGoogle")} />{' '}
        <SignInButton app={app} provider="github" label={t("signInWithGitHub")} /></div></main>}
    </div>
    {user && <nav className="bottom-bar" aria-label={t("mobileNavigation")}>{(['channels', 'conversation', 'thread'] as const).map((tab, index) => <button key={tab} aria-current={mobileView === tab ? 'page' : undefined} onClick={() => { setMobileView(tab); window.dispatchEvent(new Event('slackie:navigate')) }}><span aria-hidden="true">{['\u2637', '\u25a4', '\u21b3'][index]}</span>{[t("channels"), t("conversation"), t("threads")][index]}</button>)}<button onClick={() => setProfileOpen(true)}><span aria-hidden="true">{user.login?.slice(0, 1).toUpperCase() || "●"}</span>{t("you")}</button></nav>}
  </div>
}

function WorkspaceShell({ profileOpen, onProfileClose }: { profileOpen: boolean; onProfileClose: () => void }) {
  const { setContext, setMobileView } = useNavigation()
  const link = useConversationSearch()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selected, setSelected] = useState(link?.workspace ?? '')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const nameInvalid = name.length > 0 && !/^[a-z0-9_-]+$/.test(name)
  const nameHelp = t("workspaceNameMustBeLowercaseWithNoSpacesUse")
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
          setSelected(current => selectAuthorizedId(rows, current, link?.workspace))
        }
      } catch (err) { if (active) { if (accessLost(err)) { setWorkspaces([]); setSelected('') }; setError(errorText(err)) } }
      finally { pending = false; if (active) setLoading(false) }
    }
    void load()
    const timer = window.setInterval(() => void load(), 10000)
    const focus = () => void load()
    window.addEventListener('focus', focus)
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', focus) }
  }, [link?.workspace])
  async function create(event: FormEvent) {
    if (nameInvalid || !name) { event.preventDefault(); setError(nameHelp); return }
    event.preventDefault(); setBusy(true); setError('')
    try {
      const id = createId.current
      const changes = await batch('workspace_create', { workspace_id: id, name, slug })
      const rows = await query<Workspace>('workspace_list')
      if (!rows.some(row => row.id === id)) throw new Error(changes[0]
        ? t("workspaceWasNotCreatedCheckTheSlugAndRetry")
        : t("workspaceNameMustBeLowercaseWithNoSpacesLetters"))
      setWorkspaces(rows); setSelected(id); openConversationLink({ workspace: id }); setName(''); setSlug(''); createId.current = crypto.randomUUID()
    } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  const workspace = workspaces.find(row => row.id === selected)
  useEffect(() => {
    setContext(current => ({ ...current, workspace: workspace?.name ?? '' }))
  }, [workspace?.name, setContext])
  useEffect(() => { setMobileView(link?.channel ? (link.thread ? 'thread' : 'conversation') : 'channels') }, [workspace?.id, link?.channel, link?.thread, setMobileView])
  async function refreshWorkspaces() { setWorkspaces(await query<Workspace>('workspace_list')) }
  return <>
    <section aria-label={t("workspaces")} className="workspace-controls">
      <label>{t("workspace")}<select value={selected} disabled={loading || busy || !workspaces.length} onChange={event => { setSelected(event.target.value); openConversationLink({ workspace: event.target.value }) }}>
        {!workspaces.length && <option value="">{t("noWorkspacesYet")}</option>}
        {workspaces.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
      </select></label>
      <details><summary>{t("createAWorkspace")}</summary><form onSubmit={create} className="slackie-form">
        <label>{t("name")}<input required autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={100} pattern="[a-z0-9_-]+" title={nameHelp} value={name} onChange={event => setName(event.target.value)} aria-invalid={nameInvalid} aria-describedby="workspace-name-help" /></label>
        <small id="workspace-name-help" role={nameInvalid ? 'alert' : undefined}>{nameHelp}</small>
        <label>{t("slug")}<input required maxLength={80} pattern="[a-z0-9-]+" value={slug} onChange={event => setSlug(event.target.value)} aria-describedby="slug-help" /></label>
        <small id="slug-help">{t("lowercaseLettersNumbersAndHyphens")}</small>
        <button aria-label={t("createWorkspace")} disabled={busy || loading || !name || nameInvalid}>{busy ? t("creating") : t("createWorkspace")}</button>
      </form></details>
    </section>
    {profileOpen && <OwnProfile key={`profile:${selected}`} workspace={workspace} onClose={onProfileClose} />}
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">{t("loadingWorkspaces")}</p> : workspace ? <ChannelShell key={workspace.id} workspace={workspace} onWorkspaceChanged={refreshWorkspaces} />
      : <main id="conversation" tabIndex={-1}><p>{link ? t("workspaceUnavailableSelectAnAvailableWorkspace") : t("createAWorkspaceToGetStarted")}</p></main>}
  </>
}
