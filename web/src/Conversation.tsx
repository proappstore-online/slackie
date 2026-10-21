import { t } from './strings'
import { useExperience } from './ExperienceProvider'
import { MessageAnnouncements } from './experience'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { app, accessLost, errorText, getMessages, joinChannel, leaveChannel, notifyChanges, sendMessage, type Channel, type Message, type Role } from './api'
import { ChannelDetails } from './ChannelDetails'
import { submitOnEnter } from './composer'
import { MessageCard } from './MessageCard'
import { ThreadPanel } from './ThreadPanel'
import { useNavigation, openConversationLink } from './navigation'

export function Conversation({ channel, role, onChannelsChange, requestedThread }: { channel: Channel; role: Role; onChannelsChange: () => Promise<void>; requestedThread?: string | null }) {
  const { mobileView, setMobileView } = useNavigation()
  const { preferences, announce, clearAnnouncements } = useExperience()
  const observer = useRef(new MessageAnnouncements())
  const baseline = useRef(true)
  const visible = !window.matchMedia('(max-width: 639px)').matches || mobileView === 'conversation'
  const speech = useRef({ preferences, announce, clearAnnouncements, visible })
  speech.current = { preferences, announce, clearAnnouncements, visible }
  useEffect(() => { baseline.current = true; speech.current.clearAnnouncements() }, [preferences.announceMessages, visible])
  useEffect(() => { const hide = () => { baseline.current = true }; document.addEventListener('visibilitychange', hide); return () => document.removeEventListener('visibilitychange', hide) }, [])
  useEffect(() => () => { observer.current.reset(); speech.current.clearAnnouncements() }, [])
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [thread, setThread] = useState<string | null>(requestedThread ?? null)
  useEffect(() => { setThread(requestedThread ?? null) }, [requestedThread])
  useEffect(() => { if (thread) setMobileView('thread') }, [thread, setMobileView])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!!channel.is_member)
  const [busy, setBusy] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [connection, setConnection] = useState(t("connectingUpdatesAlsoPollEvery10Seconds"))
  const nonce = useRef<{ id: string; content: string } | null>(null)
  const pages = useRef(1)
  const refreshRef = useRef<() => Promise<void>>(async () => {})
  const hintRef = useRef<() => void>(() => {})
  const endRef = useRef<HTMLDivElement>(null)
  const params = { workspace_id: channel.workspace_id, channel_id: channel.id }
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
          if (active) { setMessages(rows); setHasMore(more); setError(''); observer.current.observe(rows, app.auth.user?.id ?? '', speech.current.preferences.announceMessages, baseline.current || document.hidden || !speech.current.visible); baseline.current = false; speech.current.announce(observer.current.flush()) }
        } catch (err) {
          if (active) { baseline.current = true; speech.current.clearAnnouncements(); if (accessLost(err)) { setMessages([]); setDraft(''); setThread(null); nonce.current = null }; setError(errorText(err)) }
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
        room.onEvent(() => { void load(); notifyChanges() }), room.onReconnect(() => { baseline.current = true; void load() }),
        room.onConnectionState(state => { if (active) setConnection(current => state === 'open' ? t("connectedUpdatesPollEvery10SecondsAndRefetchOn") : current.includes('capacity') ? current : t("pollingEvery10SecondsRealtimeIsReconnectingOrUnavailable")) }),
        room.onClose(info => {
          if (!active) return
          setConnection(info.kind === 'capacity' ? t("roomAtCapacityUpdatesContinueByPollingEvery10") : t("realtimeUnavailableUpdatesContinueByPollingEvery10Seconds"))
          if (info.kind === 'auth') { baseline.current = true; observer.current.reset(); speech.current.clearAnnouncements(); setMessages([]); setDraft(''); setThread(null); nonce.current = null; void onChannelsChange().catch(() => {}) }
        }),
      ]
      closeRoom = () => { unsubs.forEach(unsub => unsub()); room.close() }
    } catch { setConnection(t("realtimeUnavailableUpdatesContinueByPollingEvery10Seconds")) }
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
      if (!count) throw new Error(t("membershipChangeRefusedGeneralAndYourLastJoinedChannel"))
      setMessages([]); setDraft(''); nonce.current = null
      await onChannelsChange()
    } catch (err) { if (accessLost(err)) { setMessages([]); setDraft(''); setThread(null); nonce.current = null; observer.current.reset(); speech.current.clearAnnouncements() }; setError(errorText(err)) } finally { setBusy(false) }
  }
  async function send(event: FormEvent) {
    event.preventDefault()
    if (!draft.trim() || busy) return
    setBusy(true); setError('')
    if (!nonce.current || nonce.current.content !== draft) nonce.current = { id: crypto.randomUUID(), content: draft }
    try {
      await sendMessage({ ...params, message_id: nonce.current.id, content: nonce.current.content })
      const rows = await getMessages(params)
      if (!rows.some(row => row.id === nonce.current?.id)) throw new Error(t("sendNotConfirmedYourDraftIsPreservedRetryWith"))
      setDraft(''); nonce.current = null; await changed(); endRef.current?.scrollIntoView({ block: 'nearest' })
    } catch (err) { if (accessLost(err)) { setMessages([]); setDraft(''); setThread(null); nonce.current = null; observer.current.reset(); speech.current.clearAnnouncements() }; setError(errorText(err)) } finally { setBusy(false) }
  }
  return <main id="conversation" tabIndex={-1} className="conversation-main" aria-labelledby="channel-title">
    <div className="conversation-context">
    <header><h2 id="channel-title"><bdi>{channel.name}</bdi>{channel.is_archived ? t("archived") : ''}</h2><p dir="auto" lang="">{channel.topic || channel.description}</p></header>
    {channel.name === 'general' && <p role="note">{t("welcomeToGeneralIntroduceYourselfAndStartAConversation")}</p>}
    <ChannelDetails channel={channel} role={role} onChanged={onChannelsChange} />
    {(!channel.is_member && !channel.is_private && !channel.is_archived) && <button disabled={busy} onClick={() => void membership()}>{t("joinChannel")}</button>}
    {!!channel.is_member && !!channel.can_leave && <button disabled={busy} onClick={() => void membership()}>{t("leaveChannel")}</button>}
    {!!channel.is_member && !channel.can_leave && <p>{t("generalAndYourLastJoinedChannelCannotBeLeft")}</p>}
    {error && <p role="alert">{error}</p>}
    </div>
    {!!channel.is_member && <>
      <div className="conversation-status">
      <p role="status">{loading ? t("loadingMessages") : connection}</p>
      <button disabled={busy || loading} onClick={() => void refresh()}>{t("refreshMessages")}</button>
      {hasMore && <button disabled={busy || loading} onClick={() => void refresh(true)}>{t("loadOlderMessages")}</button>}
      </div><div className={thread ? "conversation-content message-and-thread" : "conversation-content"}><section className="channel-conversation" aria-label={t("channelConversation")}><div className="message-scroll"><ol aria-label={t("messages")} className="message-list">{[...messages].reverse().map(message =>
        <MessageCard key={message.id} message={message} params={{ ...params, message_id: message.id }} role={role} archived={!!channel.is_archived} onChanged={changed} onThread={() => { setThread(message.id); openConversationLink({ workspace: channel.workspace_id, channel: channel.id, thread: message.id }) }} />
      )}</ol>{!loading && !messages.length && <p>{t("noMessagesYet")}</p>}<div ref={endRef} /></div>
      <form onSubmit={send} className="slackie-form"><label>{t("message")}<textarea dir="auto" lang="" required maxLength={10000} value={draft} readOnly={busy} disabled={!!channel.is_archived} aria-describedby="send-help"
          onChange={event => setDraft(event.target.value)} onKeyDown={event => submitOnEnter(event, preferences.sendOnEnter)} /></label>
        <small id="send-help">{preferences.sendOnEnter ? t("enterSendsShiftEnterAddsALine") : t("enterAddsALine")} {t("ctrlEnterOrCommandEnterSendsUseHandlesFrom")}</small>
        <button disabled={busy || loading || !!channel.is_archived || !draft.trim()}>{busy ? t("sending") : t("sendMessage")}</button>
        {error && draft && <button type="button" onClick={() => { if (!navigator.clipboard) setError(t('copyUnavailable')); else void navigator.clipboard.writeText(draft).catch(() => setError(t('copyUnavailable'))) }}>{t("copyDraft")}</button>}
        {!!channel.is_archived && <p>{t("archivedChannelMessagesAreReadOnly")}</p>}
      </form></section>{thread && <ThreadPanel key={thread} channel={channel} parentId={thread} role={role} onClose={() => { setThread(null); openConversationLink({ workspace: channel.workspace_id, channel: channel.id }); setMobileView('conversation') }} onChanged={changed} />}</div>
    </>}
    {!thread && <p className="empty-thread">{t("openAMessageReplyToViewItsThread")}</p>}
  </main>
}
