/**
 * Negative tests per scoped action (PAS-DATA-022) against a real SQLite built from
 * migrations.json, bound the way the platform binds: one param pool and one clock reading per
 * call, :__uuid per occurrence, batch statements in one transaction.
 *
 *   node --no-warnings qa/actions.mjs          (part of `pnpm test`)
 */
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const read = (p) => JSON.parse(readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8'))
const TOOLS = Object.fromEntries(read('../mcp.json').tools.map((t) => [t.name, t]))

const db = new DatabaseSync(':memory:')
db.exec('PRAGMA foreign_keys = ON')
for (const m of read('../migrations.json').migrations) db.exec(m.sql)

function resolve(tool, params) {
  const out = {}
  for (const [name, schema] of Object.entries(tool.params ?? {})) {
    let value = params[name]
    if (value === undefined || value === null) {
      if (schema.default !== undefined) value = schema.default
      else if (schema.optional) value = null
      else throw new Error(`${tool.name}: missing required parameter ${name}`)
    }
    if (value !== null && schema.type === 'integer') value = Number(value)
    out[name] = value
  }
  for (const name of Object.keys(params)) if (!(name in (tool.params ?? {}))) throw new Error(`${tool.name}: unknown parameter ${name}`)
  return out
}

function bind(sql, resolved, user, now) {
  const values = []
  const bound = sql.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
    if (name === '__user_id') values.push(user)
    else if (name === '__now') values.push(now)
    else if (name === '__uuid') values.push(randomUUID())
    else if (name in resolved) values.push(resolved[name])
    else throw new Error(`unresolved parameter: ${name}`)
    return '?'
  })
  return [bound, values]
}

let clock = Date.now()
export function call(name, user, params = {}) {
  const tool = TOOLS[name]
  if (!tool) throw new Error(`no such action: ${name}`)
  if (tool.requires_auth && !user) throw new Error("Authentication required")
  const resolved = resolve(tool, params)
  const now = ++clock
  if (tool.operation === 'batch') {
    db.exec('BEGIN')
    try {
      const changes = tool.statements.map((s) => { const [sql, v] = bind(s, resolved, user, now); return db.prepare(sql).run(...v).changes })
      db.exec('COMMIT')
      return changes
    } catch (e) { db.exec('ROLLBACK'); throw e }
  }
  const [sql, values] = bind(tool.sql, resolved, user, now)
  const stmt = db.prepare(sql)
  return tool.operation === 'query' ? stmt.all(...values) : stmt.run(...values).changes
}


// Exercise the exact registered SQL against SQLite, never a parallel authorization model.
let checks = 0
function ok(value, label) { if (!value) throw new Error(label); checks++; console.log('PASS ' + label) }
function denied(name, user, params) {
  const before = db.prepare('SELECT count(*) AS n FROM audit_log').get().n
  const result = call(name, user, params)
  ok(Array.isArray(result) && result.every(n => n === 0), name + ' refuses unauthorized mutation')
  ok(db.prepare('SELECT count(*) AS n FROM audit_log').get().n === before, name + ' refusal has no audit')
}
const W = { workspace_id: 'w1' }, C = { ...W, channel_id: 'c1' }, P = { ...W, channel_id: 'private' }
const M = { ...C, message_id: 'm1' }, R = { ...M, emoji: 'thumbsup' }
ok(Object.keys(TOOLS).length === 19, 'all 19 expected actions registered')
ok(Object.values(TOOLS).every(t => t.requires_auth), 'all actions require authentication')
ok(Object.values(TOOLS).filter(t => t.operation !== 'query').every(t => t.operation === 'batch' && t.statements.at(-1).includes('INSERT INTO audit_log')), 'all mutations end with guarded audit')
for (const name of Object.keys(TOOLS)) {
  let rejected = false
  try { call(name, null, {}) } catch { rejected = true }
  ok(rejected, name + ' requires identity')
}
ok(call('workspace_create', 'owner', { ...W, name: 'One', slug: 'one' })[0] === 1, 'create workspace and initial owner')
ok(call('workspace_create', 'other', { workspace_id: 'w2', name: 'Two', slug: 'two' })[0] === 1, 'create independent workspace')
denied('workspace_create', 'outsider', { ...W, name: 'Hijack', slug: 'hijack' })
denied('workspace_create', 'owner', { ...W, name: 'Retry', slug: 'one' })
ok(call('workspace_get', 'outsider', W).length === 0, 'workspace_get hides tenant')
ok(call('workspace_list', 'outsider').length === 0, 'workspace_list hides tenants')
ok(call('workspace_get', 'owner', W)[0].role === 'owner', 'creator is owner')
ok(call('workspace_list', 'other').every(w => w.id === 'w2'), 'workspace_list scoped to caller')
const samples = {
  workspace_member_add: { ...W, user_id: 'injected', role: 'admin' },
  workspace_member_remove: { ...W, user_id: 'owner' },
  workspace_member_role_set: { ...W, user_id: 'owner', role: 'member' },
  channel_create: { ...W, channel_id: 'injected', name: 'injected' },
  channel_join: C, channel_leave: C, channel_member_add: { ...C, user_id: 'outsider' },
  message_send: { ...M, body: 'injected' }, message_edit: { ...M, body: 'injected' },
  message_delete: M, reaction_add: R, reaction_remove: R, channel_mark_read: C,
}
call('workspace_member_add', 'owner', { ...W, user_id: 'admin', role: 'admin' })
call('workspace_member_add', 'owner', { ...W, user_id: 'member' })
call('workspace_member_add', 'owner', { ...W, user_id: 'reader' })
ok(call('channel_create', 'member', { ...C, name: 'general' })[0] === 1, 'member creates public channel and joins atomically')
ok(call('channel_create', 'member', { ...P, name: 'secret', is_private: 1 })[0] === 1, 'create private channel')
ok(call('channel_get', 'owner', P).length === 0, 'owner cannot read private metadata without membership')
ok(call('channel_list', 'owner', W).every(c => c.id !== 'private'), 'private channel hidden in lists')
ok(call('channel_get', 'member', P).length === 1, 'private member reads channel')
for (const [name, params] of Object.entries(samples)) denied(name, 'outsider', params)
ok(call('channel_get', 'outsider', C).length === 0, 'channel_get rejects outsider')
ok(call('channel_list', 'outsider', W).length === 0, 'channel_list rejects outsider')
ok(call('message_list', 'outsider', C).length === 0, 'message_list rejects outsider')
for (const name of ['workspace_member_add', 'workspace_member_remove', 'workspace_member_role_set']) denied(name, 'member', samples[name])
denied('workspace_member_role_set', 'admin', { ...W, user_id: 'member', role: 'admin' })
denied('workspace_member_add', 'admin', { ...W, user_id: 'escalated', role: 'owner' })
denied('workspace_member_remove', 'admin', { ...W, user_id: 'owner' })
denied('workspace_member_role_set', 'owner', { ...W, user_id: 'owner', role: 'member' })
denied('workspace_member_role_set', 'owner', { ...W, user_id: 'member', role: 'owner' })
ok(call('workspace_member_role_set', 'owner', { ...W, user_id: 'reader', role: 'admin' })[0] === 1, 'owner changes ordinary role')
call('workspace_member_role_set', 'owner', { ...W, user_id: 'reader', role: 'member' })
denied('channel_join', 'owner', P)
denied('channel_member_add', 'owner', { ...P, user_id: 'owner' })
denied('channel_member_add', 'member', { ...C, user_id: 'reader' })
ok(call('channel_member_add', 'admin', { ...C, user_id: 'reader' })[0] === 1, 'admin adds existing workspace member to public channel')
denied('channel_member_add', 'admin', { ...C, user_id: 'other' })
ok(call('channel_join', 'owner', C)[0] === 1, 'owner joins public channel')
ok(call('channel_join', 'admin', C)[0] === 1, 'admin joins public channel')
ok(call('message_send', 'member', { ...M, body: '<script>plain text</script>' })[0] === 1, 'channel member sends durable plain text')
denied('message_send', 'member', { ...M, body: 'duplicate' })
ok(call('message_list', 'member', C).filter(m => m.id === 'm1').length === 1, 'retry creates one message')
denied('message_edit', 'reader', { ...M, body: 'not mine' })
denied('message_delete', 'reader', M)
denied('message_edit', 'member', { ...M, channel_id: 'private', body: 'wrong channel' })
denied('message_send', 'member', { ...M, workspace_id: 'w2', body: 'wrong tenant' })
ok(call('message_edit', 'member', { ...M, body: 'edited' })[0] === 1, 'author edits own message')
ok(call('reaction_add', 'reader', R)[0] === 1, 'member reacts')
denied('reaction_add', 'reader', R)
denied('reaction_remove', 'member', R)
ok(call('reaction_remove', 'reader', R)[0] === 1, 'caller removes own reaction')
ok(call('channel_mark_read', 'reader', C)[0] === 1, 'read time uses server clock')
const readAt = db.prepare('SELECT last_read_at FROM channel_members WHERE channel_id = ? AND user_id = ?').get('c1', 'reader').last_read_at
call('channel_mark_read', 'reader', C)
ok(db.prepare('SELECT last_read_at FROM channel_members WHERE channel_id = ? AND user_id = ?').get('c1', 'reader').last_read_at > readAt, 'read time advances monotonically')
ok(call('message_delete', 'admin', M)[0] === 1, 'channel-member admin tombstones message')
ok(call('message_list', 'reader', C)[0].body === '', 'tombstone hides prior body')
denied('message_edit', 'member', { ...M, body: 'restore' })
denied('reaction_add', 'reader', R)
denied('message_delete', 'admin', M)
ok(call('channel_leave', 'reader', C)[0] === 1, 'member leaves channel')
ok(call('message_list', 'reader', C).length === 0, 'channel leave revokes message reads')
denied('message_send', 'reader', { ...C, message_id: 'after-leave', body: 'no' })
call('channel_join', 'reader', C)
ok(call('workspace_member_remove', 'owner', { ...W, user_id: 'reader' })[0] === 1, 'owner removes ordinary member')
ok(call('message_list', 'reader', C).length === 0, 'removal immediately revokes reads')
ok(db.prepare('SELECT count(*) AS n FROM channel_members WHERE user_id = ?').get('reader').n === 0, 'removal clears channel membership')
for (const [name, params] of Object.entries(samples)) denied(name, 'reader', params)
for (const [name, params] of Object.entries(samples)) denied(name, 'owner', { ...params, workspace_id: 'w2' })
// Private content remains inaccessible to privileged workspace roles.
const privateMessage = { ...P, message_id: 'private-message' }
call('message_send', 'member', { ...privateMessage, body: 'private content' })
ok(call('message_list', 'owner', P).length === 0, 'owner cannot read private messages')
denied('message_delete', 'owner', privateMessage)
denied('message_edit', 'admin', { ...privateMessage, body: 'overwrite' })
denied('reaction_add', 'owner', { ...privateMessage, emoji: 'x' })
denied('channel_create', 'member', { ...C, name: 'general' })
// Audit insertion failure rolls back the mutation in the same transaction.
db.exec("CREATE TRIGGER reject_audit BEFORE INSERT ON audit_log BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END")
let rolledBack = false
try { call('message_send', 'member', { ...C, message_id: 'rollback', body: 'must roll back' }) } catch { rolledBack = true }
ok(rolledBack && db.prepare("SELECT count(*) AS n FROM messages WHERE id = 'rollback'").get().n === 0, 'failed audit rolls back message write')
db.exec('DROP TRIGGER reject_audit')
// Keyset cursor tie-breaks and fixed page size.
for (let i = 0; i < 55; i++) db.prepare('INSERT INTO messages VALUES (?,?,?,?,?,?,?,?)').run('page-' + String(i).padStart(2,'0'),'c1','w1','member','page',100,100,0)
const firstPage = call('message_list', 'member', C)
ok(firstPage.length === 50, 'timeline page is bounded')
const last = firstPage.at(-1)
const nextPage = call('message_list', 'member', { ...C, before_at: last.created_at, before_id: last.id })
ok(!nextPage.some(n => firstPage.some(p => p.id === n.id)) && firstPage.length + nextPage.length === 56, 'keyset pagination loses no equal-timestamp rows')
// Every authenticated outsider/cross-tenant refusal above also proves no audit disclosure/write.
ok(!JSON.stringify(db.prepare('SELECT * FROM audit_log').all()).includes('plain text'), 'audit excludes message content')
console.log('Passed ' + checks + ' assertions across all 19 actions.')
