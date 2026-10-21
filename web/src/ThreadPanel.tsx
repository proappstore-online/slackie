import { t } from './strings'
import { useNavigation } from './navigation'
import { useExperience } from './ExperienceProvider'
import { MessageAnnouncements } from './experience'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { app, accessLost, errorText, getThreadRoot, listThread, threadReply, type Channel, type Message, type Role } from './api'
import { submitOnEnter } from './composer'
import { MessageCard } from './MessageCard'

export function ThreadPanel({ channel, parentId, role, onClose, onChanged }: { channel: Channel; parentId: string; role: Role; onClose: () => void; onChanged: () => Promise<void> }) {
  const { mobileView } = useNavigation()
  const { preferences, announce, clearAnnouncements } = useExperience()
  const observer = useRef(new MessageAnnouncements())
  const baseline = useRef(true)
  const visible = !window.matchMedia('(max-width: 639px)').matches || mobileView === 'thread'
  const speech = useRef({ preferences, announce, clearAnnouncements, visible })
  speech.current = { preferences, announce, clearAnnouncements, visible }
  useEffect(() => { baseline.current = true; speech.current.clearAnnouncements() }, [preferences.announceMessages, visible])
  useEffect(() => { const hide = () => { baseline.current = true }; document.addEventListener('visibilitychange', hide); return () => document.removeEventListener('visibilitychange', hide) }, [])
  useEffect(() => () => { observer.current.reset(); speech.current.clearAnnouncements() }, [])
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
          if (!context) { baseline.current = true; observer.current.reset(); speech.current.clearAnnouncements(); setRoot(null); setReplies([]); setDraft(''); pending.current = null; setError(t("thisThreadIsUnavailableOrAccessHasChanged")); return }
          let rows: Message[] = []; let more = false
          for (let page = 0; page < pages; page++) {
            const next = await listThread({ ...params, ...(rows.length ? { before_id: rows.at(-1)!.id } : {}) })
            rows = [...rows, ...next]; more = next.length === 50
            if (!active) return
            if (!more) break
          }
          if (active) { setRoot(context); setReplies(rows); setHasMore(more); setError(''); observer.current.observe(rows, app.auth.user?.id ?? '', speech.current.preferences.announceMessages, baseline.current || document.hidden || !speech.current.visible); baseline.current = false; speech.current.announce(observer.current.flush()) }
        } catch (err) { if (active) { baseline.current = true; speech.current.clearAnnouncements(); if (accessLost(err)) { setRoot(null); setReplies([]); setDraft(''); pending.current = null }; setError(errorText(err)) } }
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
      if (!rows.some(row => row.id === pending.current?.id)) throw new Error(t("replyNotConfirmedYourDraftIsPreservedRetry"))
      setDraft(''); pending.current = null; await changed(); endRef.current?.scrollIntoView({ block: 'nearest' })
    } catch (err) { if (accessLost(err)) { setRoot(null); setReplies([]); setDraft(''); pending.current = null; observer.current.reset(); speech.current.clearAnnouncements() }; setError(errorText(err)) } finally { setBusy(false) }
  }
  return <section aria-labelledby={labelId} className="thread-panel">
    <header className="slackie-header"><h3 id={labelId} ref={titleRef} tabIndex={-1}>{t("threadText")}</h3><button onClick={onClose}>{t("closeThread")}</button></header>
    {loading && <p role="status">{t("loadingThread")}</p>}{error && <p role="alert">{error}</p>}
    {root && <>
      <p><strong dir="auto">{root.display_name || t("formerMember")}</strong></p>
      <p className="message-body" lang="" dir="auto">{root.deleted_at !== null ? t("parentMessageDeleted") : root.body}</p>
      {hasMore && <button disabled={busy} onClick={() => setPages(current => current + 1)}>{t("loadOlderReplies")}</button>}
      <div className="message-scroll"><ol aria-label={t("threadReplies")} className="message-list">{[...replies].reverse().map(reply =>
        <MessageCard key={reply.id} message={reply} params={{ workspace_id: channel.workspace_id, channel_id: channel.id, message_id: reply.id }}
          role={role} archived={!!channel.is_archived} onChanged={changed} />
      )}</ol>{!replies.length && <p>{t("noRepliesYet")}</p>}<div ref={endRef} /></div>
      <form onSubmit={submit} className="slackie-form"><label>{t("reply")}<textarea dir="auto" lang="" required maxLength={10000} value={draft} readOnly={busy} disabled={!!channel.is_archived || root.deleted_at !== null}
          onChange={event => setDraft(event.target.value)} onKeyDown={event => submitOnEnter(event, preferences.sendOnEnter)} /></label><button disabled={busy || !!channel.is_archived || root.deleted_at !== null || !draft.trim()}>{busy ? t("sending") : t("sendReply")}</button>
        {error && draft && <button type="button" onClick={() => { if (!navigator.clipboard) setError(t('copyUnavailable')); else void navigator.clipboard.writeText(draft).catch(() => setError(t('copyUnavailable'))) }}>{t("copyDraft")}</button>}
      </form>
    </>}
  </section>
}
