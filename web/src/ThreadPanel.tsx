import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { errorText, getThreadRoot, listThread, threadReply, type Channel, type Message, type Role } from './api'
import { MessageCard } from './MessageCard'

export function ThreadPanel({ channel, parentId, role, onClose, onChanged }: { channel: Channel; parentId: string; role: Role; onClose: () => void; onChanged: () => Promise<void> }) {
  const [root, setRoot] = useState<Message | null>(null)
  const [replies, setReplies] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [pages, setPages] = useState(1)
  const pending = useRef<{ id: string; content: string } | null>(null)
  const refreshRef = useRef<() => Promise<void>>(async () => {})
  const titleRef = useRef<HTMLHeadingElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const labelId = useId()
  const params = { workspace_id: channel.workspace_id, channel_id: channel.id, parent_id: parentId }
  const newest = replies[0]?.id
  useEffect(() => { if (newest) endRef.current?.scrollIntoView({ block: 'nearest' }) }, [newest])
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    titleRef.current?.focus()
    return () => { if (opener?.isConnected) opener.focus() }
  }, [])
  useEffect(() => {
    let active = true
    let request: Promise<void> | null = null
    async function load() {
      if (request) return request
      request = (async () => {
        try {
          const context = await getThreadRoot(params)
          if (!active) return
          if (!context) { setRoot(null); setReplies([]); setError('This thread is unavailable or access has changed.'); return }
          let rows: Message[] = []; let more = false
          for (let page = 0; page < pages; page++) {
            const next = await listThread({ ...params, ...(rows.length ? { before_id: rows.at(-1)!.id } : {}) })
            rows = [...rows, ...next]; more = next.length === 50
            if (!active) return
            if (!more) break
          }
          if (active) { setRoot(context); setReplies(rows); setHasMore(more); setError('') }
        } catch (err) { if (active) { setRoot(null); setReplies([]); setError(errorText(err)) } }
        finally { if (active) setLoading(false) }
      })()
      try { await request } finally { request = null }
    }
    refreshRef.current = async () => { if (request) await request; await load() }
    void load()
    const timer = window.setInterval(() => void load(), 10000)
    window.addEventListener('focus', load); window.addEventListener('slackie:changes', load)
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', load); window.removeEventListener('slackie:changes', load); refreshRef.current = async () => {} }
    // The panel is keyed by root and the conversation by channel/membership.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.workspace_id, channel.id, parentId, pages])
  async function changed() { await onChanged(); await refreshRef.current() }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft.trim() || busy) return
    setBusy(true); setError('')
    if (!pending.current || pending.current.content !== draft) pending.current = { id: crypto.randomUUID(), content: draft }
    try {
      await threadReply({ ...params, message_id: pending.current.id, content: pending.current.content })
      const rows = await listThread(params)
      if (!rows.some(row => row.id === pending.current?.id)) throw new Error('Reply not confirmed. Your draft is preserved; retry.')
      setDraft(''); pending.current = null; await changed()
    } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  return <section aria-labelledby={labelId} className="thread-panel">
    <header className="slackie-header"><h3 id={labelId} ref={titleRef} tabIndex={-1}>Thread</h3><button onClick={onClose}>Close thread</button></header>
    {loading && <p role="status">Loading thread…</p>}{error && <p role="alert">{error}</p>}
    {root && <>
      <p><strong>{root.display_name || 'Former member'}</strong></p>
      <p className="message-body">{root.deleted_at !== null ? 'Parent message deleted' : root.body}</p>
      {hasMore && <button disabled={busy} onClick={() => setPages(current => current + 1)}>Load older replies</button>}
      <div className="message-scroll"><ol aria-label="Thread replies" className="message-list">{[...replies].reverse().map(reply =>
        <MessageCard key={reply.id} message={reply} params={{ workspace_id: channel.workspace_id, channel_id: channel.id, message_id: reply.id }}
          role={role} archived={!!channel.is_archived} onChanged={changed} />
      )}</ol>{!replies.length && <p>No replies yet.</p>}<div ref={endRef} /></div>
      <form onSubmit={submit} className="slackie-form"><label>Reply
        <textarea required maxLength={10000} value={draft} disabled={busy || !!channel.is_archived || root.deleted_at !== null}
          onChange={event => setDraft(event.target.value)} onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit() }
          }} /></label><button disabled={busy || !!channel.is_archived || root.deleted_at !== null || !draft.trim()}>Send reply</button>
      </form>
    </>}
  </section>
}
