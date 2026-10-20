import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '@proappstore/sdk'
import { app, batch, errorText, query, type Channel, type Message, type Workspace } from './api'

export default function App() {
  const { user, loading, signIn, signOut } = useAuth(app)
  return <div className="slackie-shell">
    <a href="#conversation" className="skip-link">Skip to conversation</a>
    <header className="slackie-header"><h1>Slackie</h1>{user && <button onClick={signOut}>Sign out</button>}</header>
    {loading ? <p role="status">Checking your session…</p> : user ? <WorkspaceShell key={user.id} />
      : <main id="conversation"><h2>Team conversations, together.</h2>
        <p>Sign in to open your workspaces. This foundation requires a configured PAS host.</p>
        <button onClick={signIn}>Sign in</button></main>}
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
    query<Workspace>('workspace_list').then(rows => {
      if (active) { setWorkspaces(rows); setSelected(rows[0]?.id ?? '') }
    }).catch(err => { if (active) setError(errorText(err)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
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
    {loading ? <p role="status">Loading workspaces…</p> : workspace ? <ChannelShell key={workspace.id} workspace={workspace} />
      : <main id="conversation"><p>Create a workspace to get started.</p></main>}
  </>
}

function ChannelShell({ workspace }: { workspace: Workspace }) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [selected, setSelected] = useState('')
  const [name, setName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const createId = useRef(crypto.randomUUID())
  const params = { workspace_id: workspace.id }
  useEffect(() => {
    let active = true
    query<Channel>('channel_list', { workspace_id: workspace.id }).then(rows => {
      if (active) { setChannels(rows); setSelected(rows[0]?.id ?? '') }
    }).catch(err => { if (active) setError(errorText(err)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [workspace.id])
  async function refresh() { setChannels(await query<Channel>('channel_list', params)) }
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const id = createId.current
      await batch('channel_create', { ...params, channel_id: id, name: name.trim(), is_private: Number(isPrivate) })
      const rows = await query<Channel>('channel_list', params)
      if (!rows.some(row => row.id === id)) throw new Error('Channel was not created. Check its name and your role.')
      setChannels(rows); setSelected(id); setName(''); createId.current = crypto.randomUUID()
    } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  const channel = channels.find(row => row.id === selected)
  return <div className="conversation-layout"><aside aria-label="Channels"><h2>Channels</h2>
    {loading && <p role="status">Loading channels…</p>}{!loading && !channels.length && <p>No channels available.</p>}
    <nav aria-label="Channel list"><ul>{channels.map(row => <li key={row.id}>
      <button aria-current={row.id === selected ? 'page' : undefined} onClick={() => setSelected(row.id)}>
        {row.is_private ? 'Private: ' : '# '}{row.name}{row.is_archived ? ' (archived)' : ''}
      </button></li>)}</ul></nav>
    {workspace.role !== 'member' && <details><summary>Create a channel</summary><form onSubmit={create} className="slackie-form">
      <label>Name <input required maxLength={80} value={name} onChange={event => setName(event.target.value)} /></label>
      <label><input type="checkbox" checked={isPrivate} onChange={event => setIsPrivate(event.target.checked)} /> Private channel</label>
      <button aria-label="Create channel" disabled={busy}>{busy ? 'Creating…' : 'Create channel'}</button>
    </form></details>}
    {error && <p role="alert">{error}</p>}
    </aside>{channel ? <Conversation key={channel.id} channel={channel} onMembershipChange={refresh} />
      : <main id="conversation"><p>Select a channel to view its conversation.</p></main>}
  </div>
}

function Conversation({ channel, onMembershipChange }: { channel: Channel; onMembershipChange: () => Promise<void> }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const nonce = useRef<{ id: string; body: string } | null>(null)
  const params = { workspace_id: channel.workspace_id, channel_id: channel.id }
  useEffect(() => {
    let active = true
    if (!channel.is_member) { setMessages([]); return }
    setLoading(true); setError('')
    query<Message>('message_list', { workspace_id: channel.workspace_id, channel_id: channel.id }).then(rows => {
      if (active) { setMessages(rows); setHasMore(rows.length === 50) }
    }).catch(err => { if (active) { setMessages([]); setError(errorText(err)) } }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [channel.id, channel.workspace_id, channel.is_member])
  async function refresh(older = false) {
    setBusy(true); setError('')
    try {
      const rows = await query<Message>('message_list', { ...params, ...(older ? { before_id: messages.at(-1)?.id } : {}) })
      setMessages(current => older ? [...current, ...rows.filter(row => !current.some(existing => existing.id === row.id))] : rows)
      setHasMore(rows.length === 50)
    } catch (err) { setMessages([]); setError(errorText(err)) } finally { setBusy(false) }
  }
  async function membership() {
    setBusy(true); setError('')
    try {
      await batch(channel.is_member ? 'channel_leave' : 'channel_join', params)
      setMessages([]); setDraft(''); nonce.current = null
      await onMembershipChange()
    } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  async function send(event: FormEvent) {
    event.preventDefault()
    if (!draft.trim()) return
    setBusy(true); setError('')
    if (!nonce.current || nonce.current.body !== draft) nonce.current = { id: crypto.randomUUID(), body: draft }
    try {
      await batch('message_send', { ...params, message_id: nonce.current.id, body: nonce.current.body })
      const rows = await query<Message>('message_list', params)
      if (!rows.some(row => row.id === nonce.current?.id)) throw new Error('Send was not confirmed. Your draft is preserved; retry or copy it.')
      setMessages(rows); setHasMore(rows.length === 50); setDraft(''); nonce.current = null
    } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  return <main id="conversation" aria-labelledby="channel-title"><h2 id="channel-title">{channel.name}{channel.is_archived ? ' (archived)' : ''}</h2>
    <p>{channel.description}</p><p>Updates load on refresh. Realtime is not enabled.</p>
    {(!channel.is_private || channel.is_member) && <button aria-label={channel.is_member ? 'Leave channel' : 'Join channel'} disabled={busy || (!channel.is_member && !!channel.is_archived)} onClick={membership}>
      {channel.is_member ? 'Leave channel' : 'Join channel'}</button>}
    {error && <p role="alert">{error}</p>}
    {!!channel.is_member && <>
      <button disabled={busy || loading} onClick={() => void refresh()}>Refresh messages</button>
      {hasMore && <button disabled={busy || loading} onClick={() => void refresh(true)}>Load older messages</button>}
      <p role="status">{loading ? 'Loading messages…' : busy ? 'Working…' : `${messages.length} messages loaded`}</p>
      {!loading && !messages.length && <p>No messages to show.</p>}
      <ol aria-label="Messages" className="message-list">{[...messages].reverse().map(message => <li key={message.id}>
        <strong>{message.user_id}</strong>{' '}<time dateTime={new Date(message.created_at).toISOString()}>{new Date(message.created_at).toLocaleString()}</time>
        <p className="message-body">{message.body}</p>{message.edited_at && <small>Edited</small>}
      </li>)}</ol>
      <form onSubmit={send} className="slackie-form"><label>Message <textarea required maxLength={10000} value={draft}
        disabled={busy || !!channel.is_archived} onChange={event => setDraft(event.target.value)} /></label>
        <button disabled={busy || loading || !!channel.is_archived || !draft.trim()}>Send message</button>
      </form>
    </>}
  </main>
}
