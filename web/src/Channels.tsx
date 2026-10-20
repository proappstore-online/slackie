import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createChannel, errorText, getChannels, type Channel, type Workspace } from './api'
import { Conversation } from './Conversation'
import { Members } from './Members'
import { Modal } from './Modal'

export function ChannelShell({ workspace }: { workspace: Workspace }) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [selected, setSelected] = useState('')
  const [view, setView] = useState<'channels' | 'members'>('channels')
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    let pending = false
    const load = async () => {
      if (pending) return
      pending = true
      try {
        const rows = await getChannels(workspace.id)
        if (active) {
          setChannels(rows)
          setSelected(current => rows.some(row => row.id === current) ? current : rows[0]?.id ?? '')
        }
      } catch (err) { if (active) { setChannels([]); setError(errorText(err)) } }
      finally { pending = false; if (active) setLoading(false) }
    }
    void load()
    const timer = window.setInterval(() => void load(), 10000)
    window.addEventListener('focus', load)
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', load) }
  }, [workspace.id])
  async function refresh() { setChannels(await getChannels(workspace.id)) }
  const channel = channels.find(row => row.id === selected)
  return <div className="conversation-layout"><aside aria-label="Workspace navigation">
    <button onClick={() => setView('members')} aria-current={view === 'members' ? 'page' : undefined}>Members</button>
    <h2>Channels</h2>{loading && <p role="status">Loading channels…</p>}
    <nav aria-label="Channels"><ul>{channels.map(row => <li key={row.id}><button
      aria-current={view === 'channels' && row.id === selected ? 'page' : undefined}
      onClick={() => { setSelected(row.id); setView('channels') }}>
      {row.is_private ? 'Private: ' : '# '}{row.name}{row.is_archived ? ' (archived)' : ''}
    </button></li>)}</ul></nav>
    {!loading && !channels.length && <p>No channels available.</p>}
    {workspace.role !== 'member' && <button onClick={() => setCreating(true)}>+ New Channel</button>}
    {error && <p role="alert">{error}</p>}
  </aside>
    {view === 'members' ? <Members key={workspace.id} workspace={workspace} /> : channel
      ? <Conversation key={`${channel.id}:${channel.is_member}`} channel={channel} role={workspace.role} onChannelsChange={refresh} />
      : <main id="conversation"><p>Select or create a channel to get started.</p></main>}
    {creating && <CreateChannel workspace={workspace} onClose={() => setCreating(false)} onCreated={async id => {
      await refresh(); setSelected(id); setView('channels'); setCreating(false)
    }} />}
  </div>
}

function CreateChannel({ workspace, onClose, onCreated }: { workspace: Workspace; onClose: () => void; onCreated: (id: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const id = useRef(crypto.randomUUID())
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      await createChannel({ workspace_id: workspace.id, channel_id: id.current, name: name.trim(), description, is_private: Number(isPrivate) })
      const rows = await getChannels(workspace.id)
      if (!rows.some(row => row.id === id.current)) throw new Error('Channel creation refused. Check its name and your role.')
      await onCreated(id.current)
    } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  return <Modal title="New channel" onClose={onClose}><form onSubmit={submit} className="slackie-form">
    <label>Name <input required maxLength={80} value={name} onChange={event => setName(event.target.value)} /></label>
    <label>Description <textarea maxLength={1000} value={description} onChange={event => setDescription(event.target.value)} /></label>
    <label><input type="checkbox" checked={isPrivate} onChange={event => setIsPrivate(event.target.checked)} /> Private channel</label>
    {error && <p role="alert">{error}</p>}<button disabled={busy}>Create channel</button>
  </form></Modal>
}
