import { t } from './strings'
import { useExperience } from './ExperienceProvider'
import { formatTimestamp } from './experience'
import { useEffect, useState } from 'react'
import { acknowledgeMention, errorText, listMentions, notifyChanges, type Mention } from './api'

export function Mentions({ workspaceId, onOpen }: { workspaceId: string; onOpen: (mention: Mention) => void }) {
  const { preferences } = useExperience()
  const [mentions, setMentions] = useState<Mention[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [pages, setPages] = useState(1)
  useEffect(() => {
    let active = true
    let pending = false
    async function load() {
      if (pending) return
      pending = true
      try {
        let rows: Mention[] = []; let more = false
        for (let page = 0; page < pages; page++) {
          const next = await listMentions({ workspace_id: workspaceId, ...(rows.length ? { before_id: rows.at(-1)!.message_id } : {}) })
          rows = [...rows, ...next]; more = next.length === 50
          if (!active) return
          if (!more) break
        }
        if (active) { setMentions(rows); setHasMore(more); setError('') }
      } catch (err) { if (active) { setMentions([]); setError(errorText(err)) } }
      finally { pending = false; if (active) setLoading(false) }
    }
    void load()
    const timer = window.setInterval(() => void load(), 10000)
    window.addEventListener('focus', load); window.addEventListener('slackie:changes', load)
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', load); window.removeEventListener('slackie:changes', load) }
  }, [workspaceId, pages])
  async function open(mention: Mention) {
    setBusy(true); setError('')
    try {
      if (mention.seen_at === null) await acknowledgeMention({ workspace_id: workspaceId, channel_id: mention.channel_id, message_id: mention.message_id })
      notifyChanges(); onOpen(mention)
    } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  return <main id="conversation"><h2>{t("mentionsText")}</h2>
    <p>{t("mentionsAreVisibleOnlyWhileYouCanAccessTheir")}</p>
    {loading && <p role="status">{t("loadingMentions")}</p>}{error && <p role="alert">{error}</p>}
    {!loading && !mentions.length && <p>{t("noMentionsYetSetYourHandleInMembersSo")}</p>}
    <ul className="message-list">{mentions.map(mention => <li key={mention.message_id}>
      <h3>{"#"}{mention.channel_name}{mention.seen_at === null ? t("new") : ''}</h3>
      <p className="message-body" lang="" dir="auto">{mention.body}</p><time lang={preferences.locale} dateTime={new Date(mention.created_at).toISOString()}>{formatTimestamp(mention.created_at, preferences)}</time>{' '}
      <button disabled={busy} onClick={() => void open(mention)}>{t("openMentionedMessage")}</button>
    </li>)}</ul>{hasMore && <button disabled={loading || busy} onClick={() => setPages(current => current + 1)}>{t("loadOlderMentions")}</button>}
  </main>
}
