import { t, message as translatedMessage } from './strings'
import { useExperience } from './ExperienceProvider'
import { formatTimestamp, formatCount } from './experience'
import { useState } from 'react'
import { app, addReaction, deleteMessage, editMessage, errorText, removeReaction, type Message, type MessageScope, type Role } from './api'

export function MessageCard({ message, params, role, archived, onChanged, onThread }: { message: Message; params: MessageScope; role: Role; archived: boolean; onChanged: () => Promise<void>; onThread?: () => void }) {
  const { preferences } = useExperience()
  const mine = message.user_id === app.auth.user?.id
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(message.body)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function action(run: () => Promise<number>) {
    if (busy) return
    setBusy(true); setError('')
    try {
      if (!await run()) throw new Error(t("changeRefusedOrAlreadyAppliedRefreshToCheckYour"))
      setEditing(false); await onChanged()
    } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  return <li className="message-card"><strong dir="auto">{message.display_name || t("formerMember")}</strong>{' '}
    <time lang={preferences.locale} dateTime={new Date(message.created_at).toISOString()} title={formatTimestamp(message.created_at, preferences)}>{formatTimestamp(message.created_at, preferences)}</time>
    {editing ? <form className="slackie-form" onSubmit={event => { event.preventDefault(); if (busy) return; if (text === message.body) setEditing(false); else void action(() => editMessage({ ...params, content: text })) }}>
      <label>{t("editMessage")}<textarea dir="auto" lang="" required maxLength={10000} disabled={busy} value={text} onChange={event => setText(event.target.value)} /></label>
      <button aria-label={t("saveMessage")} disabled={busy || !text.trim()}>{t("saveMessage")}</button><button type="button" disabled={busy} onClick={() => setEditing(false)}>{t("cancelEdit")}</button>
    </form> : <p className="message-body" lang="" dir="auto">{message.body}</p>}
    {message.edited_at !== null && <small>{t("edited")}</small>}
    {onThread && message.parent_id === null && <button onClick={onThread}>{translatedMessage('replyInThreadCount', { count: formatCount(message.reply_count, preferences) })}</button>}
    <div className="message-actions">
      {mine && !archived && Date.now() - message.created_at < 86400000 && <button disabled={busy} onClick={() => { setText(message.body); setEditing(true) }}>{t("editMessage")}</button>}
      {(mine || role !== 'member') && <button disabled={busy} onClick={() => {
        if (window.confirm(t('confirmDelete'))) void action(() => deleteMessage(params))
      }}>{t("deleteMessage")}</button>}
      <div aria-label={t("reactions")}>{['👍', '❤️', '😄'].map(emoji => {
        const reaction = message.reactions.find(row => row.emoji === emoji)
        return <button key={emoji} aria-label={translatedMessage(reaction?.reacted ? 'reactionRemove' : 'reactionAdd', { emoji })} aria-pressed={!!reaction?.reacted}
          disabled={busy || archived} onClick={() => void action(() => reaction?.reacted ? removeReaction({ ...params, emoji }) : addReaction({ ...params, emoji }))}>
          {emoji} {formatCount(reaction?.count || 0, preferences)}</button>
      })}</div>
    </div>{error && <p role="alert">{error}</p>}
  </li>
}
