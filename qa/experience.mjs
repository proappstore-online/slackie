import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolvePreferences, readPreferences, preferenceKey, validLocale, validTimeZone, shouldSubmit, formatTimestamp, formatCount, messageSummary, MessageAnnouncements, parseConversationLink, conversationSearch, selectAuthorizedId } from '../web/src/experience.ts'
import { recoveryKind } from '../web/src/recovery.ts'
import { english, t, message } from '../web/src/strings.ts'

const defaults = resolvePreferences(null)
test('preference precedence, validation, and safe storage fallback', () => {
  assert.deepEqual(defaults, { locale: 'en', timeZone: 'UTC', sendOnEnter: true, announceMessages: false })
  assert.equal(resolvePreferences({ locale: 'fr-fr', timeZone: 'Europe/Paris' }, 'en-AU', 'Australia/Melbourne').locale, 'fr-FR')
  const browser = resolvePreferences({ locale: '!', timeZone: 'Mars/City' }, 'en-AU', 'Australia/Melbourne')
  assert.equal(browser.locale, 'en-AU'); assert.equal(browser.timeZone, 'Australia/Melbourne')
  assert.deepEqual(resolvePreferences({ locale: {}, timeZone: [], sendOnEnter: 'false', announceMessages: 'true' }, '!', 'invalid'), defaults)
  for (const raw of ['{', 'null', '42', '[]']) assert.deepEqual(readPreferences({ getItem: () => raw }), defaults)
  assert.deepEqual(readPreferences({ getItem() { throw new Error('blocked') } }), defaults)
  assert.equal(readPreferences({ getItem: key => { assert.equal(key, preferenceKey); return '{"sendOnEnter":false,"announceMessages":true}' } }).sendOnEnter, false)
  assert.equal(validLocale('AR-eg'), 'ar-EG'); assert.equal(validTimeZone('UTC'), 'UTC')
})
test('composer respects IME, newline preference, modifiers and explicit send', () => {
  for (const enabled of [true, false]) {
    for (const ctrl of [true, false]) for (const meta of [true, false]) {
      assert.equal(shouldSubmit('Enter', true, false, ctrl, meta, enabled), false)
      assert.equal(shouldSubmit('Enter', false, true, ctrl, meta, enabled), false)
      assert.equal(shouldSubmit('Tab', false, false, ctrl, meta, enabled), false)
      assert.equal(shouldSubmit('Enter', false, false, ctrl, meta, enabled), enabled || ctrl || meta)
    }
  }
})
test('Intl timestamps disambiguate DST and respect personal zone across midnight', () => {
  const ny = resolvePreferences({ locale: 'en-US', timeZone: 'America/New_York' })
  const first = formatTimestamp(Date.parse('2026-11-01T05:30:00Z'), ny)
  const second = formatTimestamp(Date.parse('2026-11-01T06:30:00Z'), ny)
  assert.match(first, /1:30/); assert.match(second, /1:30/); assert.notEqual(first, second)
  assert.match(formatTimestamp(Date.parse('2026-03-08T06:59:00Z'), ny), /1:59/)
  assert.match(formatTimestamp(Date.parse('2026-03-08T07:00:00Z'), ny), /3:00/)
  assert.match(formatTimestamp(Date.parse('2026-10-21T00:30:00Z'), ny), /Oct 20/)
  assert.match(formatTimestamp(Date.parse('2026-10-21T00:30:00Z'), defaults), /Oct 21/)
  assert.equal(formatCount(12345, resolvePreferences({ locale: 'de-DE' })), '12.345')
})
test('catalogue has pseudolocale expansion and named sentence parameters', () => {
  for (const key of Object.keys(english)) {
    assert.equal(t(key), english[key])
    assert.ok(t(key, 'pseudo').length >= english[key].length * 1.4)
    assert.ok(!english[key].includes('undefined'))
  }
  assert.equal(message('reactionAdd', { emoji: '👍' }), 'Add 👍 reaction')
  assert.equal(message('replyInThreadCount', { count: '12' }), 'Reply in thread (12)')
  for (const n of [0, 1, 2, 5, 11, 101]) assert.equal(messageSummary(n, defaults), `${n} new ${n === 1 ? 'message' : 'messages'}.`)
})
const row = (n, user = 'other') => ({ id: `m${String(n).padStart(4, '0')}`, created_at: n, user_id: user })
test('announcements coalesce authorized arrivals and never replay history, edits or own sends', () => {
  const observer = new MessageAnnouncements()
  observer.observe([row(2), row(1)], 'me', true); assert.equal(observer.flush(), 0)
  observer.observe([row(3), row(2), row(1), row(0)], 'me', true)
  observer.observe([row(5, 'me'), row(4), row(3), row(2)], 'me', true)
  assert.equal(observer.flush(), 2); assert.equal(observer.flush(), 0)
  observer.observe([row(5, 'me'), row(4), row(3), row(2), row(1)], 'me', true)
  assert.equal(observer.flush(), 0)
  observer.reset(); observer.observe([], 'me', true); observer.observe([row(1)], 'me', true)
  assert.equal(observer.flush(), 1)
})
test('hundred arrivals produce one count; disable, reconnect and revocation clear queues', () => {
  const observer = new MessageAnnouncements()
  observer.observe([], 'me', true)
  observer.observe(Array.from({ length: 100 }, (_, i) => row(100 - i)), 'me', true)
  assert.equal(observer.flush(), 100)
  observer.observe([row(101)], 'me', true)
  observer.observe([row(102)], 'me', false)
  assert.equal(observer.flush(), 0)
  observer.observe([row(103)], 'me', true, true); assert.equal(observer.flush(), 0)
  observer.observe([row(104)], 'me', true); observer.reset(); assert.equal(observer.flush(), 0)
  observer.observe([row(200)], 'me', true); assert.equal(observer.flush(), 0)
})
test('links round trip IDs without replacing invite params; reject unbounded or malformed input', () => {
  const link = { workspace: 'w-1', channel: 'c_2', thread: 'm-3' }
  const search = conversationSearch('?invite=test&other=1', link)
  assert.deepEqual(parseConversationLink(search), link)
  assert.equal(new URLSearchParams(search).get('invite'), 'test')
  assert.equal(new URLSearchParams(conversationSearch(search, { workspace: 'w-2' })).has('channel'), false)
  for (const bad of ['?channel=c', '?workspace=w&thread=t', '?workspace=w&channel=../../x', '?workspace=' + 'a'.repeat(201)]) assert.equal(parseConversationLink(bad), null)
})
test('only authorized lists select a linked resource; revoked IDs never fall back silently', () => {
  const rows = [{ id: 'allowed' }, { id: 'other' }]
  assert.equal(selectAuthorizedId(rows, '', 'allowed'), 'allowed')
  assert.equal(selectAuthorizedId(rows, 'allowed', 'private'), '')
  assert.equal(selectAuthorizedId([], 'allowed', 'allowed'), '')
  assert.equal(selectAuthorizedId(rows, 'other'), 'other')
  assert.equal(selectAuthorizedId(rows, 'removed'), 'allowed')
})
test('recovery distinguishes transient failure, rate limiting, denial and expired invites', () => {
  assert.equal(recoveryKind(503), 'offline'); assert.equal(recoveryKind(0), 'offline')
  assert.equal(recoveryKind(undefined, false), 'offline')
  for (const status of [401, 403]) assert.equal(recoveryKind(status, false), 'denied')
  assert.equal(recoveryKind(429), 'rateLimited')
  assert.equal(recoveryKind(410, true, true), 'expiredInvite')
  assert.equal(recoveryKind(404), 'unavailable'); assert.equal(recoveryKind(400), 'unknown')
})
