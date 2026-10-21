import { message } from './strings.ts'

// Pure experience policies: no auth, storage or browser globals at module load.
export interface Preferences {
  locale: string
  timeZone: string
  sendOnEnter: boolean
  announceMessages: boolean
}
export const preferenceKey = 'slackie:experience:v1'
export function validLocale(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return
  try { return Intl.getCanonicalLocales(value)[0] } catch { return }
}
export function validTimeZone(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return
  try { return new Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions().timeZone } catch { return }
}
export function resolvePreferences(raw: unknown, browserLocale = 'en', browserZone = 'UTC'): Preferences {
  const value = raw && typeof raw === 'object' ? raw as Partial<Preferences> : {}
  return {
    locale: validLocale(value.locale) ?? validLocale(browserLocale) ?? 'en',
    timeZone: validTimeZone(value.timeZone) ?? validTimeZone(browserZone) ?? 'UTC',
    sendOnEnter: typeof value.sendOnEnter === 'boolean' ? value.sendOnEnter : true,
    announceMessages: value.announceMessages === true,
  }
}
export function readPreferences(storage: Pick<Storage, 'getItem'>, locale?: string, zone?: string): Preferences {
  try { return resolvePreferences(JSON.parse(storage.getItem(preferenceKey) || 'null'), locale, zone) }
  catch { return resolvePreferences(null, locale, zone) }
}
export function shouldSubmit(key: string, shift: boolean, composing: boolean, control: boolean, meta: boolean, sendOnEnter: boolean) {
  return key === 'Enter' && !shift && !composing && (sendOnEnter || control || meta)
}
export function formatTimestamp(value: number, preferences: Preferences) {
  return new Intl.DateTimeFormat(preferences.locale, {
    timeZone: preferences.timeZone, year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(value)
}
export function formatCount(value: number, preferences: Preferences) {
  return new Intl.NumberFormat(preferences.locale).format(value)
}
export function messageSummary(count: number, preferences: Preferences) {
  const plural = new Intl.PluralRules('en').select(count)
  return message(plural === 'one' ? 'newMessageOne' : 'newMessageOther', { count: formatCount(count, preferences) })
}
// Track only IDs from authorized newest-first snapshots. History, edits, page
// expansion and reconnect baselines must never become new-message speech.
export class MessageAnnouncements {
  private seen = new Set<string>()
  private newest: { id: string; created_at: number } | undefined
  private pending = 0
  private initialized = false
  reset() { this.seen.clear(); this.newest = undefined; this.pending = 0; this.initialized = false }
  observe(rows: { id: string; created_at: number; user_id: string }[], ownId: string, enabled: boolean, baseline = false) {
    const latest = rows[0]
    if (baseline || !enabled) this.pending = 0
    if (this.initialized && !baseline && enabled) {
      this.pending += rows.filter(row => !this.seen.has(row.id) && row.user_id !== ownId &&
        (!this.newest || row.created_at > this.newest.created_at || (row.created_at === this.newest!.created_at && row.id > this.newest!.id))).length
    }
    this.seen = new Set(rows.map(row => row.id))
    if (latest && (!this.newest || latest.created_at > this.newest.created_at || (latest.created_at === this.newest.created_at && latest.id > this.newest.id))) this.newest = latest
    this.initialized = true
  }
  flush() { const count = this.pending; this.pending = 0; return count }
}

export interface ConversationLink { workspace: string; channel?: string; thread?: string }
export function parseConversationLink(search: string): ConversationLink | null {
  const params = new URLSearchParams(search)
  const workspace = params.get('workspace'), channel = params.get('channel'), thread = params.get('thread')
  const safe = (value: string) => value.length <= 200 && /^[\w-]+$/.test(value)
  if (!workspace || !safe(workspace) || (channel && !safe(channel)) || (thread && (!channel || !safe(thread)))) return null
  return { workspace, ...(channel ? { channel } : {}), ...(thread ? { thread } : {}) }
}
export function conversationSearch(search: string, link: ConversationLink) {
  const params = new URLSearchParams(search)
  for (const key of ['workspace', 'channel', 'thread'] as const) {
    const value = link[key]
    if (value) params.set(key, value); else params.delete(key)
  }
  return `?${params}`
}

export function selectAuthorizedId(rows: { id: string }[], current: string, requested?: string) {
  if (requested) return rows.some(row => row.id === requested) ? requested : ''
  return rows.some(row => row.id === current) ? current : rows[0]?.id ?? ''
}
