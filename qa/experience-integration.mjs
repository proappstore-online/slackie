import assert from 'node:assert/strict'
import { test, after } from 'node:test'
import { mkdtemp, readFile, readdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'

// Compile the real React app for DOM integration tests without Chromium.
// The SDK boundary is mocked; authorization itself remains covered by SQL tests.
const webRequire = createRequire(new URL('../web/package.json', import.meta.url))
const ts = webRequire('typescript')
const scratch = await mkdtemp(join(tmpdir(), 'slackie-experience-'))
const React = webRequire('react')
const { act } = React
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' })
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, IS_REACT_ACT_ENVIRONMENT: true })
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator })
Object.defineProperty(document, 'hidden', { configurable: true, value: false })
window.matchMedia = () => ({ matches: false })
let scrolls = 0
window.HTMLElement.prototype.scrollIntoView = () => { scrolls++ }
window.HTMLDialogElement.prototype.showModal = function () { this.open = true; this.querySelector('button')?.focus() }
window.HTMLDialogElement.prototype.close = function () { this.open = false }
const timers = new Map()
window.setInterval = (fn, ms) => { const handle = setInterval(() => {}, 1e9); handle.unref(); timers.set(handle, { fn, ms }); return handle }
const { createRoot } = webRequire('react-dom/client')
const sdk = {
  auth: { user: { id: 'me', login: 'Me' } },
  actions: { call: async () => ({ rows: [] }) },
  rooms: { join() { throw new Error('No room in DOM integration test') } },
}
globalThis.__slackieTestSDK = sdk
await writeFile(join(scratch, 'package.json'), '{"type":"module"}')
await writeFile(join(scratch, 'sdk.js'), `export class ActionError extends Error { constructor(status) { super('private server detail'); this.status = status } }
export const initPro = () => globalThis.__slackieTestSDK
export const useAuth = () => ({ user: globalThis.__slackieTestSDK.auth.user, loading: false, signOut() {} })
export const SignInButton = () => null
`)
for (const file of await readdir(new URL('../web/src/', import.meta.url))) {
  if (!/\.tsx?$/.test(file) || file.endsWith('.d.ts')) continue
  const source = await readFile(new URL('../web/src/' + file, import.meta.url), 'utf8')
  let code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
  code = code.replace(/from ['"](@proappstore\/sdk)['"]/g, "from './sdk.js'")
    .replace(/from ['"](\.\/[^'"]+)['"]/g, (_, path) => `from '${path.replace(/\.(?:tsx?|js)$/, '')}.js'`)
    .replace(/from ['"](react(?:\/jsx-runtime)?)['"]/g, (_, name) => `from '${pathToFileURL(webRequire.resolve(name)).href}'`)
  await writeFile(join(scratch, file.replace(/\.tsx?$/, '.js')), code)
}
const load = name => import(pathToFileURL(join(scratch, name + '.js')))
const { default: App } = await load('App')
const { ExperienceProvider } = await load('ExperienceProvider')
const { ActionError } = await load('sdk')
const { preferenceKey } = await load('experience')
let root
async function mount(search = '') {
  window.history.replaceState(null, '', '/' + search)
  document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(React.createElement(ExperienceProvider, null, React.createElement(App))))
}
async function cleanup() {
  if (root) await act(async () => root.unmount())
  for (const handle of timers.keys()) clearInterval(handle)
  timers.clear(); window.localStorage.clear(); scrolls = 0
}
after(async () => { await cleanup(); dom.window.close(); await rm(scratch, { recursive: true, force: true }); delete globalThis.__slackieTestSDK })
const button = name => [...document.querySelectorAll('button')].find(el => el.textContent === name)
async function click(element) { assert.ok(element, 'control exists'); await act(async () => element.click()) }
async function tick(ms) { await act(async () => { for (const { fn, ms: delay } of [...timers.values()]) if (delay === ms) await fn() }) }
const workspace = { id: 'w', name: 'team', slug: 'team', role: 'owner' }
const channel = { id: 'c', workspace_id: 'w', name: 'general', topic: '', description: '', is_member: 1, is_private: 0, is_archived: 0, can_leave: 0 }
const msg = (n, user = 'other') => ({ id: 'm' + n, user_id: user, display_name: 'Private sender', body: 'Private body', created_at: n * 1000, edited_at: null, deleted_at: null, parent_id: null, reply_count: 0, reactions: '[]' })
let messages = [], replies = [], failure, calls = []
function fixture() {
  messages = [msg(1)]; replies = []; failure = undefined; calls = []
  sdk.actions.call = async (name, params) => {
    calls.push({ name, params })
    if (name === 'workspace_list') return { rows: [workspace] }
    if (name === 'get_channels') return { rows: [channel] }
    if (name === 'get_mention_count') return { rows: [{ count: 0 }] }
    if (name === 'get_messages') { if (failure) throw failure; return { rows: messages } }
    if (name === 'get_thread_root') return { rows: params.parent_id === 'm1' ? [msg(1)] : [] }
    if (name === 'list_thread') { if (failure) throw failure; return { rows: replies } }
    if (['send_message', 'thread_reply'].includes(name)) {
      if (failure) throw failure
      const sent = { ...msg(99, 'me'), id: params.message_id, body: params.content, parent_id: params.parent_id ?? null }
      if (name === 'send_message') messages = [sent, ...messages]; else replies = [sent, ...replies]
      return { results: [{ meta: { changes: 1 } }] }
    }
    return { rows: [] }
  }
}
test('real app restores authorized links, rejects unavailable workspace/channel/root and handles browser back', async () => {
  try {
    fixture(); await mount('?workspace=w&channel=c&thread=m1')
    assert.ok(document.querySelector('.thread-panel'))
    assert.ok(calls.some(call => call.name === 'get_thread_root' && call.params.parent_id === 'm1'))
    await act(async () => { window.history.replaceState(null, '', '/?workspace=w&channel=private'); window.dispatchEvent(new Event('popstate')) })
    assert.match(document.body.textContent, /Conversation unavailable/)
    assert.equal(document.querySelector('.message-body'), null)
    assert.ok(!calls.some(call => call.name === 'get_messages' && call.params.channel_id === 'private'))
    await cleanup(); fixture(); await mount('?workspace=unknown&channel=private')
    assert.match(document.body.textContent, /Workspace unavailable/)
    assert.ok(!calls.some(call => call.name === 'get_channels'))
    await cleanup(); fixture(); await mount('?workspace=w&channel=c&thread=private')
    assert.match(document.querySelector('.thread-panel').textContent, /thread is unavailable/)
    assert.ok(!calls.some(call => call.name === 'list_thread'))
  } finally { await cleanup() }
})
test('reload restores the authorized thread selection without persisting private drafts', async () => {
  try {
    fixture(); await mount('?workspace=w&channel=c&thread=m1')
    const drafts = [...document.querySelectorAll('.conversation-content textarea')]
    assert.equal(drafts.length, 2)
    await input(drafts[0], 'private channel draft')
    await input(drafts[1], 'private reply draft')
    const search = window.location.search
    assert.ok(!search.includes('draft'))
    assert.ok(!JSON.stringify(window.localStorage).includes('private'))
    await cleanup(); fixture(); await mount(search)
    assert.ok(document.querySelector('.thread-panel'))
    assert.ok(calls.some(call => call.name === 'get_thread_root' && call.params.parent_id === 'm1'))
    for (const textarea of document.querySelectorAll('.conversation-content textarea')) assert.equal(textarea.value, '')
  } finally { await cleanup() }
})
test('real app coalesces private-free speech, keeps focus and scroll, silences reconnect and revocation', async () => {
  try {
    fixture(); window.localStorage.setItem(preferenceKey, '{"announceMessages":true}')
    await mount('?workspace=w&channel=c')
    const composer = document.querySelector('textarea[aria-describedby="send-help"]')
    composer.focus()
    await tick(5000)
    const status = () => document.querySelector('.sr-only').textContent
    assert.equal(status(), '')
    messages = [msg(3), msg(2), msg(1)]
    await tick(10000); assert.equal(status(), '')
    await tick(5000); assert.equal(status(), '2 new messages.')
    assert.equal(document.activeElement, composer); assert.equal(scrolls, 0)
    assert.ok(!status().includes('Private'))
    failure = new ActionError(503); await tick(10000)
    failure = undefined; messages = [msg(4), ...messages]; await tick(10000); await tick(5000)
    assert.equal(status(), '')
    messages = [msg(5), ...messages]; await tick(10000)
    failure = new ActionError(403); await tick(10000); await tick(5000)
    assert.equal(status(), ''); assert.equal(document.querySelector('.message-body'), null)
    assert.match(document.body.textContent, /Access denied/)
    assert.ok(!document.body.textContent.includes('private server detail'))
  } finally { await cleanup() }
})
test('experience controls validate input, persist only preferences and update formatting', async () => {
  try {
    fixture(); await mount()
    const labels = [...document.querySelectorAll('label')]
    const checkbox = labels.find(el => el.textContent === 'Enter sends messages').querySelector('input')
    await click(checkbox)
    const saved = JSON.parse(window.localStorage.getItem(preferenceKey))
    assert.equal(saved.sendOnEnter, false); assert.equal(saved.announceMessages, false)
    assert.deepEqual(Object.keys(saved).sort(), ['announceMessages', 'locale', 'sendOnEnter', 'timeZone'])
    assert.match(document.getElementById('send-help').textContent, /Enter adds a line/)
    const locale = labels.find(el => el.textContent === 'Formatting locale').querySelector('input')
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(locale, '!invalid')
      locale.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
    assert.equal(locale.getAttribute('aria-invalid'), 'true')
    assert.equal(button('Save formatting preferences').disabled, true)
  } finally { await cleanup() }
})

async function input(element, value) {
  await act(async () => {
    const proto = element instanceof window.HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, value)
    element.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
}
async function key(element, options = {}) {
  await act(async () => element.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...options })))
}
test('both real composers honor newline preference, modifiers, IME and idempotent failure recovery', async () => {
  try {
    fixture(); window.localStorage.setItem(preferenceKey, '{"sendOnEnter":false}')
    await mount('?workspace=w&channel=c&thread=m1')
    for (const [index, textarea] of [...document.querySelectorAll('.conversation-content textarea')].entries()) {
      const action = index === 0 ? 'send_message' : 'thread_reply'
      await input(textarea, 'draft')
      await key(textarea); await key(textarea, { isComposing: true, ctrlKey: true }); await key(textarea, { shiftKey: true, ctrlKey: true })
      assert.equal(calls.filter(call => call.name === action).length, 0)
      failure = new ActionError(503)
      textarea.focus(); await key(textarea, { ctrlKey: true })
      assert.equal(textarea.value, 'draft'); assert.equal(document.activeElement, textarea)
      assert.ok(button('Copy draft'))
      await click(button('Copy draft')); assert.match(document.body.textContent, /Copy unavailable/)
      const id = calls.find(call => call.name === action).params.message_id
      failure = undefined; await key(textarea, { metaKey: true })
      const sends = calls.filter(call => call.name === action)
      assert.equal(sends.length, 2); assert.equal(sends[1].params.message_id, id)
      assert.equal(textarea.value, '')
    }
  } finally { await cleanup() }
})
test('mobile tabs preserve drafts, background panes stay silent, polling preserves the channel list', async () => {
  try {
    window.matchMedia = () => ({ matches: true })
    fixture(); window.localStorage.setItem(preferenceKey, '{"announceMessages":true}')
    await mount('?workspace=w&channel=c')
    const textarea = document.querySelector('textarea[aria-describedby="send-help"]')
    await input(textarea, 'mobile draft')
    await click([...document.querySelectorAll('.bottom-bar button')][0])
    messages = [msg(2), ...messages]; await tick(10000); await tick(5000)
    assert.equal(document.querySelector('.app-shell').dataset.mobileView, 'channels')
    assert.equal(document.querySelector('.sr-only').textContent, '')
    await click([...document.querySelectorAll('.bottom-bar button')][1])
    assert.equal(textarea.value, 'mobile draft')
    assert.equal(document.querySelector('.app-shell').dataset.mobileView, 'conversation')
    failure = new ActionError(403); await tick(10000)
    assert.equal(textarea.value, '')
  } finally { window.matchMedia = () => ({ matches: false }); await cleanup() }
})
test('modal focus restores to channel navigation when the opener disappears', async () => {
  try {
    fixture(); await mount()
    const opener = button('+ New Channel'); opener.focus(); await click(opener)
    opener.remove()
    await click(button('Close'))
    assert.equal(document.activeElement, document.getElementById('channel-navigation'))
  } finally { await cleanup() }
})

test('formatting changes synchronize across tabs; unsupported storage never blocks preferences', async () => {
  try {
    fixture(); await mount()
    const original = document.querySelector('time').textContent
    await act(async () => {
      window.localStorage.setItem(preferenceKey, '{"locale":"ar-EG","timeZone":"Asia/Tokyo"}')
      window.dispatchEvent(new window.StorageEvent('storage', { key: preferenceKey }))
    })
    const time = document.querySelector('time')
    assert.notEqual(time.textContent, original); assert.equal(time.lang, 'ar-EG')
    assert.equal(document.documentElement.lang, 'en'); assert.equal(document.documentElement.dir, 'ltr')
    assert.equal(document.querySelector('.message-body').getAttribute('dir'), 'auto')
    assert.equal(document.querySelector('.message-body').getAttribute('lang'), '')
    const descriptor = Object.getOwnPropertyDescriptor(window.Storage.prototype, 'setItem')
    try {
      window.Storage.prototype.setItem = () => { throw new Error('storage blocked') }
      const control = [...document.querySelectorAll('label')].find(el => el.textContent === 'Enter sends messages').querySelector('input')
      await click(control)
      assert.match(document.getElementById('send-help').textContent, /Enter adds a line/)
    } finally { Object.defineProperty(window.Storage.prototype, 'setItem', descriptor) }
  } finally { await cleanup() }
})
test('announcements are off by default and opting out clears a queued summary', async () => {
  try {
    fixture(); await mount('?workspace=w&channel=c')
    messages = [msg(2), ...messages]; await tick(10000); await tick(5000)
    assert.equal(document.querySelector('.sr-only').textContent, '')
    const control = [...document.querySelectorAll('label')].find(el => el.textContent === 'Announce new message counts').querySelector('input')
    await click(control); await tick(10000)
    messages = [msg(3), ...messages]; await tick(10000)
    await click(control); await tick(5000)
    assert.equal(document.querySelector('.sr-only').textContent, '')
  } finally { await cleanup() }
})

test('workspace creation validates while typing, blocks submission and creates a valid workspace', async () => {
  try {
    const rows = []
    calls = []
    sdk.actions.call = async (name, params) => {
      calls.push({ name, params })
      if (name === 'workspace_list') return { rows: [...rows] }
      if (name === 'workspace_create') {
        rows.push({ id: params.workspace_id, name: params.name, slug: params.slug, role: 'owner' })
        return { results: [{ meta: { changes: 1 } }] }
      }
      return { rows: [] }
    }
    await mount()
    const form = document.querySelector('.workspace-controls form')
    const [name, slug] = form.querySelectorAll('input')
    const submit = form.querySelector('button')
    await input(slug, 'valid-team')
    assert.equal(name.getAttribute('autocapitalize'), 'none')
    for (const invalid of ['Uppercase', 'has spaces', ' leading', 'trailing ', 'tab\tname', 'nonbreaking\u00a0space', 'bad.name']) {
      await input(name, invalid)
      assert.equal(name.getAttribute('aria-invalid'), 'true')
      assert.match(document.getElementById('workspace-name-help').textContent, /lowercase with no spaces/)
      assert.equal(submit.disabled, true)
      // Also bypass native validation to exercise the submit handler's guard.
      await act(async () => form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
      assert.equal(calls.filter(call => call.name === 'workspace_create').length, 0)
    }
    await input(name, 'valid-team')
    assert.equal(name.getAttribute('aria-invalid'), 'false')
    assert.equal(submit.disabled, false)
    await click(submit)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].name, 'valid-team')
    assert.match(document.querySelector('.workspace-controls select').textContent, /valid-team/)
  } finally { await cleanup() }
})

test('workspace form displays explicit server validation errors and retains entered values', async () => {
  try {
    sdk.actions.call = async name => name === 'workspace_create'
      ? { results: [{ meta: { changes: 0 }, rows: [{ error: 'Workspace name must be lowercase with no spaces. Use 1 to 100 lowercase letters, numbers, underscores or hyphens.' }] }] }
      : { rows: [] }
    await mount()
    const form = document.querySelector('.workspace-controls form')
    const [name, slug] = form.querySelectorAll('input')
    await input(name, 'my-team'); await input(slug, 'my-team')
    await click(form.querySelector('button'))
    assert.match(document.querySelector('[role="alert"]').textContent, /Use 1 to 100 lowercase letters/)
    assert.equal(name.value, 'my-team')
    assert.equal(slug.value, 'my-team')
  } finally { await cleanup() }
})

test('thread entry focuses its named heading and close restores the connected reply opener', async () => {
  try {
    fixture(); await mount('?workspace=w&channel=c')
    const opener = button('Reply in thread (0)')
    opener.focus(); await click(opener)
    const panel = document.querySelector('.thread-panel')
    const heading = document.getElementById(panel.getAttribute('aria-labelledby'))
    assert.equal(document.activeElement, heading)
    assert.equal(heading.textContent, 'Thread')
    assert.equal(panel.getAttribute('aria-modal'), null)
    await click(button('Close thread'))
    assert.equal(document.querySelector('.thread-panel'), null)
    assert.equal(document.activeElement, opener)
  } finally { await cleanup() }
})

test('dialog names its title, focuses safe Close and handles native cancel without submitting', async () => {
  try {
    fixture(); await mount()
    const opener = button('+ New Channel')
    opener.focus(); await click(opener)
    const dialog = document.querySelector('dialog')
    assert.equal(document.getElementById(dialog.getAttribute('aria-labelledby')).textContent, 'New channel')
    assert.equal(document.activeElement, button('Close'))
    const cancel = new window.Event('cancel', { cancelable: true })
    await act(async () => dialog.dispatchEvent(cancel))
    assert.equal(cancel.defaultPrevented, true)
    assert.equal(document.querySelector('dialog'), null)
    assert.equal(document.activeElement, opener)
    assert.ok(!calls.some(call => call.name === 'create_channel'))
  } finally { await cleanup() }
})

test('hiding the document cancels queued speech and resumes with a silent authorized baseline', async () => {
  try {
    fixture(); window.localStorage.setItem(preferenceKey, '{"announceMessages":true}')
    await mount('?workspace=w&channel=c')
    const composer = document.querySelector('textarea[aria-describedby="send-help"]')
    composer.focus()
    messages = [msg(2), ...messages]; await tick(10000)
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    await act(async () => document.dispatchEvent(new Event('visibilitychange')))
    await tick(5000)
    assert.equal(document.querySelector('.sr-only').textContent, '')
    messages = [msg(3), ...messages]; await tick(10000)
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    await act(async () => document.dispatchEvent(new Event('visibilitychange')))
    await tick(10000); await tick(5000)
    assert.equal(document.querySelector('.sr-only').textContent, '')
    messages = [msg(4), ...messages]; await tick(10000); await tick(5000)
    const region = document.querySelector('.sr-only')
    assert.equal(region.textContent, '1 new message.')
    assert.equal(region.getAttribute('aria-live'), 'polite')
    assert.equal(region.getAttribute('aria-atomic'), 'true')
    assert.equal(document.querySelector('.message-list').hasAttribute('aria-live'), false)
    assert.equal(document.activeElement, composer)
    assert.equal(scrolls, 0)
  } finally {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    await cleanup()
  }
})

test('rate limiting preserves both drafts and retry IDs; confirmed denial removes private recovery', async () => {
  for (const inThread of [false, true]) {
    try {
      fixture(); await mount('?workspace=w&channel=c' + (inThread ? '&thread=m1' : ''))
      const surface = document.querySelector(inThread ? '.thread-panel' : '.channel-conversation')
      const composer = surface.querySelector('textarea')
      const action = inThread ? 'thread_reply' : 'send_message'
      await input(composer, 'private recovery draft'); composer.focus()
      failure = new ActionError(429)
      await key(composer)
      assert.equal(composer.value, 'private recovery draft')
      assert.equal(document.activeElement, composer)
      assert.ok(surface.querySelector('button[type="button"]'))
      assert.match(document.body.textContent, /Too many requests/)
      assert.ok(!document.body.textContent.includes('private server detail'))
      const first = calls.find(call => call.name === action)
      await tick(10000); await tick(5000)
      assert.equal(calls.filter(call => call.name === action).length, 1, 'polling never resends')
      assert.equal(composer.value, 'private recovery draft')
      await key(composer)
      const attempts = calls.filter(call => call.name === action)
      assert.equal(attempts.length, 2)
      assert.equal(attempts[1].params.message_id, first.params.message_id)
      failure = new ActionError(403)
      await key(composer)
      if (inThread) assert.equal(surface.querySelector('textarea'), null, 'revoked thread removes its composer')
      else assert.equal(composer.value, '')
      assert.ok(!surface.textContent.includes('Copy draft'))
      assert.ok(!surface.textContent.includes('Private body'))
      assert.match(document.body.textContent, /Access denied/)
      assert.ok(!localStorage.getItem('draft'))
    } finally { await cleanup() }
  }
})
