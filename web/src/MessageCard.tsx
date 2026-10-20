import { useState } from 'react'
import { app, addReaction, deleteMessage, editMessage, errorText, removeReaction, type Message, type MessageScope, type Role } from './api'

function timestamp(value: number) {
  const date = new Date(value)
  const minutes = Math.floor((Date.now() - value) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function MessageCard({ message, params, role, archived, onChanged, onThread }: { message: Message; params: MessageScope; role: Role; archived: boolean; onChanged: () => Promise<void>; onThread?: () => void }) {
  const mine = message.user_id === app.auth.user?.id
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(message.body)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function action(run: () => Promise<number>) {
    setBusy(true); setError('')
    try {
      if (!await run()) throw new Error('Change refused or already applied. Refresh to check your access.')
      setEditing(false); await onChanged()
    } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  return <li className="message-card"><strong>{message.display_name || 'Former member'}</strong>{' '}
    <time dateTime={new Date(message.created_at).toISOString()} title={new Date(message.created_at).toLocaleString()}>{timestamp(message.created_at)}</time>
    {editing ? <form className="slackie-form" onSubmit={event => { event.preventDefault(); if (text === message.body) setEditing(false); else void action(() => editMessage({ ...params, content: text })) }}>
      <label>Edit message <textarea required maxLength={10000} value={text} onChange={event => setText(event.target.value)} /></label>
      <button disabled={busy || !text.trim()}>Save message</button><button type="button" onClick={() => setEditing(false)}>Cancel edit</button>
    </form> : <p className="message-body">{message.body}</p>}
    {message.edited_at !== null && <small>Edited</small>}
    {onThread && message.parent_id === null && <button onClick={onThread}>Reply in thread ({message.reply_count})</button>}
    <div className="message-actions">
      {mine && !archived && Date.now() - message.created_at < 86400000 && <button disabled={busy} onClick={() => { setText(message.body); setEditing(true) }}>Edit message</button>}
      {(mine || role !== 'member') && <button disabled={busy} onClick={() => {
        if (window.confirm('Delete this message?')) void action(() => deleteMessage(params))
      }}>Delete message</button>}
      <div aria-label="Reactions">{['👍', '❤️', '😄'].map(emoji => {
        const reaction = message.reactions.find(row => row.emoji === emoji)
        return <button key={emoji} aria-label={`${reaction?.reacted ? 'Remove' : 'Add'} ${emoji} reaction`} aria-pressed={!!reaction?.reacted}
          disabled={busy || archived} onClick={() => void action(() => reaction?.reacted ? removeReaction({ ...params, emoji }) : addReaction({ ...params, emoji }))}>
          {emoji} {reaction?.count || 0}</button>
      })}</div>
    </div>{error && <p role="alert">{error}</p>}
  </li>
}
