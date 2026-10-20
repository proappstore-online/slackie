import { useEffect, useRef, useState, type FormEvent } from 'react'
import { app, accessLost, errorText, getMessages, joinChannel, leaveChannel, notifyChanges, sendMessage, type Channel, type Message, type Role } from './api'
import { ChannelDetails } from './ChannelDetails'
import { submitOnEnter } from './composer'
import { MessageCard } from './MessageCard'
import { ThreadPanel } from './ThreadPanel'
import { useNavigation } from './navigation'

export function Conversation({ channel, role, onChannelsChange, requestedThread }: { channel: Channel; role: Role; onChannelsChange: () => Promise<void>; requestedThread?: string | null }) {
  const { setMobileView } = useNavigation()
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [thread, setThread] = useState<string | null>(requestedThread ?? null)
  useEffect(() => { if (requestedThread) setThread(requestedThread) }, [requestedThread])
  useEffect(() => { if (thread) setMobileView('thread') }, [thread, setMobileView])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!!channel.is_member)
  const [busy, setBusy] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [connection, setConnection] = useState('Connecting; updates also poll every 10 seconds.')
  const nonce = useRef<{ id: string; content: string } | null>(null)
  const pages = useRef(1)
  const refreshRef = useRef<() => Promise<void>>(async () => {})
  const hintRef = useRef<() => void>(() => {})
  const endRef = useRef<HTMLDivElement>(null)
  const params = { workspace_id: channel.workspace_id, channel_id: channel.id }
  const newest = messages[0]?.id
  useEffect(() => { if (newest) endRef.current?.scrollIntoView({ block: 'nearest' }) }, [newest])
  useEffect(() => {
    if (!channel.is_member) return
    let active = true
    let currentRequest: Promise<void> | null = null
    async function load() {
      if (currentRequest) return currentRequest
      currentRequest = (async () => {
        try {
          // Re-read the loaded window, including old edits/deletions. Room data
          // never enters message state; these authorized action results do.
          let rows: Message[] = []
          let more = false
          for (let page = 0; page < pages.current; page++) {
            const next = await getMessages({ ...params, ...(rows.length ? { before_id: rows.at(-1)!.id } : {}) })
            if (!active) return
            rows = [...rows, ...next]; more = next.length === 50
            if (!more) break
          }
          if (active) { setMessages(rows); setHasMore(more); setError('') }
        } catch (err) {
          if (active) { if (accessLost(err)) { setMessages([]); setDraft(''); setThread(null); nonce.current = null }; setError(errorText(err)) }
        } finally { if (active) setLoading(false) }
      })()
      try { await currentRequest } finally { currentRequest = null }
    }
    refreshRef.current = async () => { if (currentRequest) await currentRequest; await load() }
    let closeRoom = () => {}
    try {
      const room = app.rooms.join(`channel:${[...channel.workspace_id].length}:${channel.workspace_id}/${channel.id}`)
      hintRef.current = () => {
        try { if (room.state === 'open') room.send({ type: 'messages_changed', channelId: channel.id }) } catch { /* Durable writes never depend on rooms. */ }
      }
      const unsubs = [
        room.onMessage<{ type?: string }>(message => { if (message.data?.type === 'messages_changed') { void load(); notifyChanges() } }),
        room.onEvent(() => { void load(); notifyChanges() }), room.onReconnect(() => void load()),
        room.onConnectionState(state => { if (active) setConnection(current => state === 'open' ? 'Connected. Updates poll every 10 seconds and refetch on hints.' : current.includes('capacity') ? current : 'Polling every 10 seconds; realtime is reconnecting or unavailable.') }),
        room.onClose(info => {
          if (!active) return
          setConnection(info.kind === 'capacity' ? 'Room at capacity. Updates continue by polling every 10 seconds.' : 'Realtime unavailable. Updates continue by polling every 10 seconds.')
          if (info.kind === 'auth') { setMessages([]); void onChannelsChange().catch(() => {}) }
        }),
      ]
      closeRoom = () => { unsubs.forEach(unsub => unsub()); room.close() }
    } catch { setConnection('Realtime unavailable. Updates continue by polling every 10 seconds.') }
    void load()
    const timer = window.setInterval(() => void load(), 10000)
    const focus = () => void load()
    window.addEventListener('focus', focus)
    return () => {
      active = false; clearInterval(timer); window.removeEventListener('focus', focus)
      closeRoom(); hintRef.current = () => {}; refreshRef.current = async () => {}
    }
    // The parent keys this component on workspace/channel/membership, so the
    // room and all private component state are discarded on context changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id, channel.workspace_id, channel.is_member])
  async function changed() { hintRef.current(); notifyChanges(); await refreshRef.current() }
  async function refresh(older = false) {
    setBusy(true)
    if (older) pages.current++
    try { await refreshRef.current() } finally { setBusy(false) }
  }
  async function membership() {
    setBusy(true); setError('')
    try {
      const count = await (channel.is_member ? leaveChannel(params) : joinChannel(params))
      if (!count) throw new Error('Membership change refused. General and your last joined channel cannot be left.')
      setMessages([]); setDraft(''); nonce.current = null
      await onChannelsChange()
    } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  async function send(event: FormEvent) {
    event.preventDefault()
    if (!draft.trim() || busy) return
    setBusy(true); setError('')
    if (!nonce.current || nonce.current.content !== draft) nonce.current = { id: crypto.randomUUID(), content: draft }
    try {
      await sendMessage({ ...params, message_id: nonce.current.id, content: nonce.current.content })
      const rows = await getMessages(params)
      if (!rows.some(row => row.id === nonce.current?.id)) throw new Error('Send not confirmed. Your draft is preserved; retry with the same text.')
      setDraft(''); nonce.current = null; await changed()
    } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  return <main id="conversation" tabIndex={-1} className="conversation-main" aria-labelledby="channel-title">
    <div className="conversation-context">
    <header><h2 id="channel-title">{channel.name}{channel.is_archived ? ' (archived)' : ''}</h2><p>{channel.topic || channel.description}</p></header>
    {channel.name === 'general' && <p role="note">Welcome to #general. Introduce yourself and start a conversation with your team.</p>}
    <ChannelDetails channel={channel} role={role} onChanged={onChannelsChange} />
    {(!channel.is_member && !channel.is_private && !channel.is_archived) && <button disabled={busy} onClick={() => void membership()}>Join channel</button>}
    {!!channel.is_member && !!channel.can_leave && <button disabled={busy} onClick={() => void membership()}>Leave channel</button>}
    {!!channel.is_member && !channel.can_leave && <p>General and your last joined channel cannot be left.</p>}
    {error && <p role="alert">{error}</p>}
    </div>
    {!!channel.is_member && <>
      <div className="conversation-status">
      <p role="status">{loading ? 'Loading messages…' : connection}</p>
      <button disabled={busy || loading} onClick={() => void refresh()}>Refresh messages</button>
      {hasMore && <button disabled={busy || loading} onClick={() => void refresh(true)}>Load older messages</button>}
      </div><div className={thread ? "conversation-content message-and-thread" : "conversation-content"}><section aria-label="Channel conversation"><div className="message-scroll"><ol aria-label="Messages" className="message-list">{[...messages].reverse().map(message =>
        <MessageCard key={message.id} message={message} params={{ ...params, message_id: message.id }} role={role} archived={!!channel.is_archived} onChanged={changed} onThread={() => setThread(message.id)} />
      )}</ol>{!loading && !messages.length && <p>No messages yet.</p>}<div ref={endRef} /></div>
      <form onSubmit={send} className="slackie-form"><label>Message
        <textarea required maxLength={10000} value={draft} disabled={busy || !!channel.is_archived} aria-describedby="send-help"
          onChange={event => setDraft(event.target.value)} onKeyDown={submitOnEnter} /></label>
        <small id="send-help">Enter or Ctrl+Enter sends. Shift+Enter adds a line. Use @handles from Members to mention teammates.</small>
        <button disabled={busy || loading || !!channel.is_archived || !draft.trim()}>Send message</button>
      </form></section>{thread && <ThreadPanel key={thread} channel={channel} parentId={thread} role={role} onClose={() => { setThread(null); setMobileView('conversation') }} onChanged={changed} />}</div>
    </>}
    {!thread && <p className="empty-thread">Open a message reply to view its thread.</p>}
  </main>
}
