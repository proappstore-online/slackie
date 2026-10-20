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

let fixedNow = null
let failWriteTo = null
let clock = Date.now()
export function call(name, user, params = {}) {
  const tool = TOOLS[name]
  if (!tool) throw new Error(`no such action: ${name}`)
  if (tool.requires_auth && !user) throw new Error("Authentication required")
  const resolved = resolve(tool, params)
  const now = fixedNow ?? ++clock
  if (tool.operation === 'batch') {
    db.exec('BEGIN')
    try {
      const changes = tool.statements.map((s) => {
        if ((failWriteTo === 'finalize' && s.startsWith('UPDATE activity_log')) || (failWriteTo && s.startsWith('INSERT INTO ' + failWriteTo))) throw new Error('simulated storage failure')
        const [sql, v] = bind(s, resolved, user, now); return db.prepare(sql).run(...v).changes
      })
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
  const before = db.prepare('SELECT count(*) AS n FROM activity_log').get().n
  const result = call(name, user, params)
  ok(Array.isArray(result) && result.every(n => n === 0), name + ' refuses unauthorized mutation')
  ok(db.prepare('SELECT count(*) AS n FROM activity_log').get().n === before, name + ' refusal has no audit')
}
const W = { workspace_id: 'w1' }, C = { ...W, channel_id: 'c1' }, P = { ...W, channel_id: 'private' }
const M = { ...C, message_id: 'm1' }, R = { ...M, emoji: 'thumbsup' }
ok(Object.keys(TOOLS).length === 47, 'all 47 expected actions registered')
ok(Object.values(TOOLS).every(t => t.requires_auth), 'all actions require authentication')
ok(Object.values(TOOLS).filter(t => t.operation !== 'query').every(t => t.operation === 'batch' && t.statements.some(s => s.startsWith('INSERT INTO audit_log')) && t.statements.some(s => s.startsWith('INSERT INTO activity_log'))), 'all mutations write guarded audit and activity records')
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
ok(call('channel_create', 'admin', { ...C, name: 'team' })[0] === 1, 'admin creates public channel and joins atomically')
ok(call('channel_create', 'admin', { ...P, name: 'secret', is_private: 1 })[0] === 1, 'create private channel')
ok(call('channel_get', 'owner', P).length === 0, 'owner cannot read private metadata without membership')
ok(call('channel_list', 'owner', W).every(c => c.id !== 'private'), 'private channel hidden in lists')
ok(call('channel_get', 'admin', P).length === 1, 'private member reads channel')
call('channel_member_add', 'admin', { ...P, user_id: 'member' })
call('channel_join', 'member', C)
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
ok(call('channel_join', 'admin', C)[0] === 0, 'creator already joined; repeated join is idempotent')
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
ok(call('message_list', 'reader', C).length === 0, 'deleted messages omitted from timeline')
ok(db.prepare("SELECT body,deleted_at FROM messages WHERE id = 'm1'").get().body === '', 'deleted body erased')
denied('message_edit', 'member', { ...M, body: 'restore' })
denied('reaction_add', 'reader', R)
denied('message_delete', 'admin', M)
call('channel_create', 'admin', { ...W, channel_id: 'other-public', name: 'other' })
call('channel_join', 'reader', { ...W, channel_id: 'other-public' })
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
denied('message_edit', 'owner', { ...privateMessage, body: 'overwrite' })
denied('reaction_add', 'owner', { ...privateMessage, emoji: 'x' })
denied('channel_create', 'member', { ...C, name: 'general' })
// Audit insertion failure rolls back the mutation in the same transaction.
failWriteTo = 'activity_log'
let rolledBack = false
try { call('message_send', 'member', { ...C, message_id: 'rollback', body: 'must roll back' }) } catch { rolledBack = true }
ok(rolledBack && db.prepare("SELECT count(*) AS n FROM messages WHERE id = 'rollback'").get().n === 0, 'failed audit rolls back message write')
failWriteTo = null
// Keyset cursor tie-breaks and fixed page size.
for (let i = 0; i < 55; i++) db.prepare('INSERT INTO messages(id,channel_id,workspace_id,user_id,body,created_at,updated_at,is_deleted) VALUES (?,?,?,?,?,?,?,?)').run('page-' + String(i).padStart(2,'0'),'c1','w1','member','page',100,100,0)
const firstPage = call('message_list', 'member', C)
ok(firstPage.length === 50, 'timeline page is bounded')
const last = firstPage.at(-1)
const nextPage = call('message_list', 'member', { ...C, before_id: last.id })
ok(!nextPage.some(n => firstPage.some(p => p.id === n.id)) && firstPage.length + nextPage.length === 55, 'keyset pagination loses no equal-timestamp rows')
// Every authenticated outsider/cross-tenant refusal above also proves no audit disclosure/write.
ok(!JSON.stringify(db.prepare('SELECT * FROM activity_log').all()).includes('plain text'), 'audit excludes message content')
denied('channel_create', 'member', { ...W, channel_id: 'member-created', name: 'forbidden' })
ok(call('message_list', 'member', { ...C, limit: 2 }).length === 2, 'requested page limit respected')
ok(call('message_list', 'member', { ...C, limit: -1 }).length === 1, 'negative limit cannot expose unbounded history')
ok(call('message_list', 'member', { ...C, before_id: 'private-message' }).length === 0, 'cross-channel cursor does not expose messages')
ok(call('message_list', 'member', { ...C, before_id: 'missing' }).length === 0, 'unknown cursor fails closed')
ok(db.prepare("SELECT deleted_at FROM messages WHERE id = 'm1'").get().deleted_at !== null, 'delete stores server timestamp')
ok(db.prepare("SELECT edited_at FROM messages WHERE id = 'm1'").get().edited_at !== null, 'edit stores server timestamp')
db.exec("UPDATE channels SET is_archived = 1 WHERE id = 'c1'")
denied('message_send', 'member', { ...C, message_id: 'archived-write', body: 'no' })
denied('message_edit', 'member', { ...C, message_id: 'page-01', body: 'no' })
denied('reaction_add', 'member', { ...C, message_id: 'page-01', emoji: 'x' })
ok(call('message_list', 'member', C).length === 50, 'archive preserves authorized history')
// The empty production schema uses one final, DDL-only baseline.
const baseline = read('../migrations.json').migrations
ok(baseline.length === 1 && baseline[0].name === '0001_baseline', 'one named baseline migration')
ok(db.prepare("SELECT count(*) AS n FROM sqlite_schema WHERE type = 'trigger'").get().n === 0, 'baseline has no implicit write logic')
ok(!/\b(UPDATE|DELETE|DROP|CASCADE)\b/i.test(baseline[0].sql), 'baseline contains only additive schema')
ok(db.prepare('SELECT mention_handle FROM workspace_members WHERE workspace_id=? AND user_id=?').get('w1','owner').mention_handle === 'uid-' + Buffer.from('owner').toString('hex'), 'workspace owner receives default mention handle')
ok(db.prepare('SELECT mention_handle FROM workspace_members WHERE workspace_id=? AND user_id=?').get('w1','member').mention_handle === 'uid-' + Buffer.from('member').toString('hex'), 'added member receives default mention handle')
ok(db.prepare('SELECT count(*) AS n FROM audit_log a LEFT JOIN activity_log l ON l.id=a.id WHERE l.id IS NULL').get().n === 0, 'every audit record has matching activity')
ok(db.prepare("SELECT count(*) AS n FROM activity_log WHERE changes != '{}'").get().n === 0, 'no unfinished operation markers survive a batch')

// New collaboration actions and their independent authorization boundaries.
const NW = { workspace_id: 'collab' }
const NC = { ...NW, channel_id: 'public-collab' }
const NP = { ...NW, channel_id: 'private-collab' }
const NM = { ...NC, message_id: 'collab-message' }
call('workspace_create', 'boss', { ...NW, name: 'Collaboration', slug: 'collab' })
for (const [user_id,role] of [['staff','admin'],['writer','member'],['teammate','member']]) call('workspace_member_add','boss',{...NW,user_id,role})
call('create_channel','boss',{...NC,name:'general'})
call('create_channel','boss',{...NP,name:'private',is_private:1})
call('join_channel','writer',NC)
call('join_channel','staff',NC)
call('channel_create','boss',{...NW,channel_id:'second',name:'second'})
call('join_channel','writer',{...NW,channel_id:'second'})
const newCases = {
 create_channel: {...NW,channel_id:'attempt',name:'attempt'},
 update_channel: {...NC,name:'renamed',topic:'topic',description:'description'}, archive_channel: NC,
 join_channel: NC, leave_channel: {...NW,channel_id:'second'},
 invite_to_channel: {...NP,user_id:'teammate'},
 send_message: {...NM,content:'hello'}, edit_message: {...NM,content:'edited'},delete_message: NM,
 add_reaction: {...NM,emoji:'??'},remove_reaction: {...NM,emoji:'??'},
 update_member_role: {...NW,user_id:'writer',role:'admin'},remove_member: {...NW,user_id:'writer'},
 update_my_profile: {...NW,display_name:'Spoof'},
}
for(const [name,params] of Object.entries(newCases)) {
 denied(name,'stranger',params)
 denied(name,'owner',params) // owner of a different workspace
}
for(const [name,params] of Object.entries({get_channels:NW,get_channel_members:NP,get_messages:NP,get_reactions:{...NM},get_workspace_members:NW,get_member_profile:{...NW,user_id:'boss'}})) {
 ok(call(name,'stranger',params).length===0,name+' denies outsider query')
 ok(call(name,'owner',params).length===0,name+' denies other-tenant owner query')
}
ok(call('get_channels','writer',NW).every(c=>c.id!=='private-collab'),'new channel list hides private names')
ok(call('get_channel_members','staff',NP).length===0,'admin cannot inspect private roster without membership')
denied('update_channel','staff',{...NP,name:'leak',topic:'',description:''})
denied('archive_channel','staff',NP)
denied('invite_to_channel','staff',{...NP,user_id:'staff'})
ok(call('invite_to_channel','boss',{...NP,user_id:'writer'})[0]===1,'private member can invite workspace member')
ok(call('invite_to_channel','writer',{...NP,user_id:'teammate'})[0]===1,'ordinary private-channel member can invite')
denied('invite_to_channel','writer',{...NP,user_id:'other'})
ok(call('get_channel_members','writer',NP).length===3,'private member reads eligible roster')
ok(call('update_channel','boss',{...NP,name:'renamed-private',topic:'A topic',description:'Context'})[0]===1,'owner edits authorized channel metadata')
ok(call('get_channels','writer',NW).find(c=>c.id===NP.channel_id).topic==='A topic','topic returned in channel list')
denied('update_channel','writer',{...NP,name:'no',topic:'',description:''})
denied('leave_channel','writer',NC) // General is protected even when another channel exists.
call('join_channel','teammate',{...NW,channel_id:'second'})
// teammate also belongs to the private channel, so this leave is safe.
ok(call('leave_channel','teammate',{...NW,channel_id:'second'})[0]===1,'member can leave an ordinary channel with another membership')
denied('leave_channel','teammate',NP)
ok(call('update_my_profile','writer',{...NW,display_name:'Ada'})[0]===1,'member updates own scoped profile')
ok(call('get_member_profile','staff',{...NW,user_id:'writer'})[0].display_name==='Ada','profile visible within workspace')
ok(call('get_workspace_members','writer',NW).find(m=>m.user_id==='writer').display_name==='Ada','directory returns display name')
ok(call('send_message','writer',{...NM,content:'Hello from Ada'})[0]===1,'new send action stores content')
ok(call('get_messages','writer',NC)[0].display_name==='Ada','timeline resolves sender name')
ok(call('get_messages','writer',NC)[0].content==='Hello from Ada','timeline returns content contract')
denied('send_message','writer',{...NC,message_id:'empty',content:'   '})
denied('send_message','writer',{...NC,message_id:'long',content:'x'.repeat(10001)})
denied('send_message','writer',{...NM,content:'retry'})
denied('edit_message','staff',{...NM,content:'not mine'})
ok(call('edit_message','writer',{...NM,content:'Updated'})[0]===1,'author edits within 24 hours')
db.prepare('INSERT INTO messages(id,channel_id,workspace_id,user_id,body,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run('old-edit','public-collab','collab','writer','Old',clock-86400001,clock-86400001)
denied('edit_message','writer',{...NC,message_id:'old-edit',content:'too late'})
denied('message_edit','writer',{...NC,message_id:'old-edit',body:'legacy bypass'})
ok(call('add_reaction','writer',{...NM,emoji:'??'})[0]===1,'new reaction inserts')
ok(call('add_reaction','staff',{...NM,emoji:'??'})[0]===1,'second member reacts')
denied('add_reaction','writer',{...NM,emoji:'??'})
const grouped = call('get_reactions','writer',NM)
ok(grouped[0].count===2 && grouped[0].reacted===1,'reaction aggregation includes count and caller flag')
ok(JSON.parse(call('get_messages','writer',NC)[0].reactions)[0].count===2,'timeline includes scoped reaction counts')
denied('remove_reaction','teammate',{...NM,emoji:'??'})
ok(call('remove_reaction','writer',{...NM,emoji:'??'})[0]===1,'new remove reaction only removes own row')
ok(call('get_reactions','writer',NM)[0].count===1 && call('get_reactions','writer',NM)[0].reacted===0,'other reaction survives removal')
const room = {room:'channel:6:collab/private-collab',key:'6:collab/private-collab'}
ok(call('can_join_channel','writer',room).length===1,'private room admits active private member')
ok(call('can_join_channel','staff',room).length===0,'private room denies nonmember admin')
ok(call('can_join_channel','writer',{...room,room:'channel:other/private-collab'}).length===0,'room/key mismatch fails closed')
ok(call('can_join_channel','owner',room).length===0,'other workspace owner denied room')
denied('update_member_role','staff',{...NW,user_id:'writer',role:'admin'})
denied('update_member_role','boss',{...NW,user_id:'boss',role:'admin'})
denied('update_member_role','boss',{...NW,user_id:'writer',role:'owner'})
ok(call('update_member_role','boss',{...NW,user_id:'teammate',role:'admin'})[0]===1,'owner promotes ordinary member')
denied('remove_member','staff',{...NW,user_id:'teammate'})
denied('remove_member','staff',{...NW,user_id:'boss'})
denied('remove_member','boss',{...NW,user_id:'boss'})
ok(call('remove_member','boss',{...NW,user_id:'teammate'})[0]===1,'owner removes non-owner')
ok(call('get_member_profile','boss',{...NW,user_id:'teammate'}).length===0,'removed member profile unavailable')
ok(call('can_join_channel','teammate',room).length===0,'membership removal revokes future room authorization')
ok(call('get_messages','teammate',NP).length===0,'membership removal revokes message action')
ok(call('delete_message','staff',NM)[0]===1,'channel-member admin soft deletes message')
ok(call('get_messages','writer',NC).every(m=>m.id!==NM.message_id),'new timeline omits deleted body')
ok(call('get_reactions','writer',NM).length===0,'deleted message reactions are hidden')
ok(call('archive_channel','boss',NP)[0]===1,'authorized owner archives private channel')
ok(call('get_channels','writer',NW).find(c=>c.id===NP.channel_id).archived_at!==null,'archive records server timestamp')
denied('send_message','writer',{...NP,message_id:'after-archive',content:'no'})
denied('join_channel','writer',NP)
// Spoofed magic actor/tenant inputs are never accepted as ordinary parameters.
for(const name of ['send_message','update_channel','update_member_role']) {
 let rejected=false
 try {call(name,'stranger',{...newCases[name],__user_id:'boss',__workspace_id:'collab'})}catch{rejected=true}
 ok(rejected,name+' rejects injected identity spoofing')
}
ok(manifestRoomCheck(),'protected channel room declared')
function manifestRoomCheck(){return read('../mcp.json').rooms.some(r=>r.pattern==='channel:*'&&r.authorize==='can_join_channel')}
// Length-qualified workspace prefixes prevent delimiter collisions across tenants.
for (const [workspace_id,channel_id,user,slug] of [['a/b','c','collision-a','collision-a'],['a','b/c','collision-b','collision-b']]) {
 call('workspace_create',user,{workspace_id,name:slug,slug})
 call('create_channel',user,{workspace_id,channel_id,name:'test'})
}
const collisionRoom={room:'channel:3:a/b/c',key:'3:a/b/c'}
ok(call('can_join_channel','collision-a',collisionRoom).length===1,'qualified room admits its own tenant')
ok(call('can_join_channel','collision-b',collisionRoom).length===0,'delimiter collision never joins another tenant room')

// Threads, server-derived mentions, and settings.
const AW={workspace_id:'attention'}, AC={...AW,channel_id:'attention-public'}, AP={...AW,channel_id:'attention-private'}
call('workspace_create','towner',{...AW,name:'Attention',slug:'attention'})
for(const [user_id,role] of [['alice','member'],['bob','member'],['tadmin','admin']]) call('workspace_member_add','towner',{...AW,user_id,role})
call('create_channel','towner',{...AC,name:'team'})
call('create_channel','towner',{...AP,name:'private',is_private:1})
call('create_channel','towner',{...AW,channel_id:'attention-lounge',name:'lounge'})
for(const user of ['alice','bob','tadmin']) call('join_channel',user,AC)
call('invite_to_channel','towner',{...AP,user_id:'alice'})
call('update_my_profile','alice',{...AW,display_name:'Alice',mention_handle:'alice'})
call('update_my_profile','bob',{...AW,display_name:'Bob',mention_handle:'bob'})
ok(call('get_member_profile','alice',{...AW,user_id:'alice'})[0].mention_handle==='alice','profile exposes canonical mention handle')
denied('update_my_profile','alice',{...AW,display_name:'Alice',mention_handle:'UPPER'})
denied('update_my_profile','alice',{...AW,display_name:'Alice',mention_handle:'uid-667574757265'})
let collision=false
try{call('update_my_profile','bob',{...AW,display_name:'Stolen',mention_handle:'alice'})}catch{collision=true}
ok(collision&&call('get_member_profile','bob',{...AW,user_id:'bob'})[0].display_name==='Bob','duplicate handles roll back profile update')
const ROOT={...AC,message_id:'attention-root'}
call('send_message','towner',{...ROOT,content:'Hello @alice and @ALICE. Ignore person@bob and @bobby and @@bob.'})
const reply={...AC,parent_id:ROOT.message_id,message_id:'attention-reply',content:'A reply for @bob'}
const thread={...AC,parent_id:ROOT.message_id}
ok(call('thread_reply','alice',reply)[0]===1,'member sends scoped thread reply')
denied('thread_reply','alice',reply)
ok(call('get_messages','alice',AC).length===1,'thread replies do not enter parent timeline')
ok(call('get_messages','alice',AC)[0].reply_count===1,'root reply count is canonical')
ok(call('list_thread','alice',thread)[0].id===reply.message_id,'thread query returns authorized reply')
ok(call('get_thread_root','alice',thread)[0].id===ROOT.message_id,'thread context returns authorized root')
for(const user of ['stranger','owner']) {
 denied('thread_reply',user,{...reply,message_id:'unauthorized'})
 ok(call('list_thread',user,thread).length===0,'thread denies outsider/other-tenant owner')
 ok(call('get_thread_root',user,thread).length===0,'root context denies outsider/other-tenant owner')
 ok(call('list_mentions',user,AW).length===0,'mentions deny outsider/other-tenant owner')
 ok(call('get_mention_count',user,AW)[0].count===0,'mention count reveals nothing across tenants')
 denied('update_workspace',user,{...AW,name:'Hijack'})
 denied('acknowledge_mention',user,ROOT)
}
denied('thread_reply','alice',{...reply,parent_id:'missing-root',message_id:'missing-parent'})
denied('thread_reply','alice',{...reply,parent_id:reply.message_id,message_id:'nested'})
denied('thread_reply','alice',{...reply,channel_id:AP.channel_id,message_id:'cross-channel-parent'})
denied('thread_reply','alice',{...reply,workspace_id:'w2',message_id:'cross-workspace-parent'})
denied('thread_reply','alice',{...reply,message_id:'empty-reply',content:'  '})
denied('thread_reply','alice',{...reply,message_id:'large-reply',content:'x'.repeat(10001)})
ok(call('list_mentions','alice',AW).filter(m=>m.message_id===ROOT.message_id).length===1,'repeated/case-insensitive mention yields one recipient')
ok(call('list_mentions','bob',AW).every(m=>m.message_id!==ROOT.message_id),'emails, handle prefixes and double-at do not mention')
ok(call('list_mentions','bob',AW).find(m=>m.message_id===reply.message_id).root_id===ROOT.message_id,'reply mention retains root navigation')
const readBefore=db.prepare('SELECT last_read_at FROM channel_members WHERE channel_id=? AND user_id=?').get(AC.channel_id,'alice').last_read_at
ok(call('acknowledge_mention','alice',ROOT)[0]===1,'recipient marks own mention seen')
ok(call('get_mention_count','alice',AW)[0].count===0,'unread mention count advances independently')
ok(db.prepare('SELECT last_read_at FROM channel_members WHERE channel_id=? AND user_id=?').get(AC.channel_id,'alice').last_read_at===readBefore,'acknowledging mention never advances channel read state')
denied('acknowledge_mention','bob',ROOT)
const seenAt=call('list_mentions','alice',AW)[0].seen_at
call('edit_message','towner',{...ROOT,content:'Updated @alice and @bob'})
ok(call('list_mentions','alice',AW)[0].seen_at===seenAt,'edit retains seen state for unchanged recipient')
ok(call('list_mentions','bob',AW).some(m=>m.message_id===ROOT.message_id),'edit creates newly introduced mention')
call('edit_message','towner',{...ROOT,content:'Updated @bob only'})
ok(call('list_mentions','alice',AW).length===0,'edit removes stale mention recipients')
call('send_message','alice',{...AC,message_id:'self-mention',content:'Hello @alice'})
ok(call('list_mentions','alice',AW).length===0,'self mentions do not create attention items')
call('send_message','alice',{...AP,message_id:'private-mention',content:'Hello @bob'})
call('thread_reply','alice',{...AP,parent_id:'private-mention',message_id:'private-reply',content:'Private reply @bob'})
ok(call('list_thread','tadmin',{...AP,parent_id:'private-mention'}).length===0,'workspace admin outside private channel cannot read replies')
ok(call('get_thread_root','tadmin',{...AP,parent_id:'private-mention'}).length===0,'workspace admin outside private channel cannot read root context')
ok(call('list_mentions','bob',AW).every(m=>m.message_id!=='private-mention'),'private nonmember is never a mention recipient')
ok(call('get_mention_count','bob',AW)[0].count===2,'unread count only includes authorized public mentions')
call('invite_to_channel','alice',{...AP,user_id:'bob'})
ok(call('list_mentions','bob',AW).every(m=>m.message_id!=='private-mention'),'joining does not backfill old mention notifications')
call('send_message','alice',{...AP,message_id:'private-mention-active',content:'Hello (@bob)!'})
ok(call('list_mentions','bob',AW).some(m=>m.message_id==='private-mention-active'),'active private member receives bounded-token mention')
// Mention/audit failure must roll back both the message and derived recipients.
failWriteTo = 'audit_log'
let aborted=false
try{call('thread_reply','alice',{...reply,message_id:'attention-abort',content:'@bob rollback'})}catch{aborted=true}
ok(aborted&&db.prepare("SELECT COUNT(*) AS n FROM messages WHERE id='attention-abort'").get().n===0&&db.prepare("SELECT COUNT(*) AS n FROM mentions WHERE message_id='attention-abort'").get().n===0,'reply, mentions and audit share one transaction')
failWriteTo = null
for(let i=0;i<55;i++)call('thread_reply','alice',{...reply,message_id:'paged-reply-'+i,content:'Reply '+i})
const threadPage=call('list_thread','bob',thread),threadNext=call('list_thread','bob',{...thread,before_id:threadPage.at(-1).id})
ok(threadPage.length===50&&threadNext.length===6,'thread pagination is bounded and complete')
ok(new Set([...threadPage,...threadNext].map(row=>row.id)).size===56,'thread keyset pages have no duplicates')
ok(call('list_thread','bob',{...thread,before_id:ROOT.message_id}).length===0,'thread cursor cannot be a root message')
call('delete_message','towner',ROOT)
ok(call('get_thread_root','alice',thread)[0].deleted_at!==null&&call('get_thread_root','alice',thread)[0].body==='','deleted root context is a body-free tombstone')
ok(call('list_thread','alice',thread).length===50,'authorized reply history survives root tombstone')
denied('thread_reply','alice',{...reply,message_id:'deleted-parent'})
ok(call('list_mentions','bob',AW).every(m=>m.message_id!==ROOT.message_id),'deleted message disappears from mention inbox')
ok(db.prepare('SELECT count(*) AS n FROM mentions WHERE message_id=?').get(ROOT.message_id).n === 0, 'message deletion physically cleans derived mentions')
call('join_channel','bob',{...AW,channel_id:'attention-lounge'})
call('leave_channel','bob',AC)
ok(call('list_thread','bob',thread).length===0,'channel leave immediately revokes thread reads')
ok(call('list_mentions','bob',AW).every(m=>m.channel_id!==AC.channel_id),'channel leave revokes and removes its mentions')
call('join_channel','bob',AC)
ok(call('list_mentions','bob',AW).every(m=>m.channel_id!==AC.channel_id),'rejoin does not resurrect revoked notifications')
call('remove_member','towner',{...AW,user_id:'bob'})
ok(call('list_mentions','bob',AW).length===0&&call('get_mention_count','bob',AW)[0].count===0,'workspace removal revokes inbox and badge')
ok(call('list_thread','bob',thread).length===0,'workspace removal revokes thread history')
call('archive_channel','towner',AP)
denied('thread_reply','alice',{...AP,parent_id:'private-mention',message_id:'archived-thread',content:'no'})
for(const user of ['alice','tadmin'])denied('update_workspace',user,{...AW,name:'Admin cannot rename'})
denied('update_workspace','towner',{...AW,name:' '})
denied('update_workspace','towner',{...AW,name:'x'.repeat(101)})
ok(call('update_workspace','towner',{...AW,name:'Renamed workspace'})[0]===1,'owner renames workspace')
ok(call('workspace_get','alice',AW)[0].name==='Renamed workspace','rename visible to authorized members')
denied('update_member_role','towner',{...AW,user_id:'towner',role:'admin'})
denied('remove_member','tadmin',{...AW,user_id:'towner'})
// Mention keyset pagination and repeated-token parsing stay bounded.
const PW={workspace_id:'mention-pages'}, PC={...PW,channel_id:'mention-page-channel'}
call('workspace_create','sender',{...PW,name:'Paged mentions',slug:'mention-pages'})
call('workspace_member_add','sender',{...PW,user_id:'receiver'})
call('create_channel','sender',{...PC,name:'team'})
call('join_channel','receiver',PC)
call('update_my_profile','receiver',{...PW,display_name:'Reader',mention_handle:'reader'})
for(let i=0;i<55;i++)call('send_message','sender',{...PC,message_id:'mention-page-'+i,content:'Hello @reader '+i})
const mentionPage=call('list_mentions','receiver',PW),mentionNext=call('list_mentions','receiver',{...PW,before_id:mentionPage.at(-1).message_id})
ok(mentionPage.length===50&&mentionNext.length===5,'mention inbox has complete 50-row keyset pages')
ok(new Set([...mentionPage,...mentionNext].map(row=>row.message_id)).size===55,'mention pages never duplicate recipients')
ok(call('get_mention_count','receiver',PW)[0].count===55,'badge counts unread beyond the visible page')
call('send_message','sender',{...PC,message_id:'dense-mentions',content:' @reader'.repeat(1200)})
ok(call('list_mentions','receiver',PW).filter(row=>row.message_id==='dense-mentions').length===1,'dense repeated mentions create one attention item per recipient')
// Both compatibility names must derive mentions and activity without schema-side writes.
const FW = { workspace_id: 'baseline-actions' }, FC = { ...FW, channel_id: 'baseline-channel' }
call('workspace_create', 'base-owner', { ...FW, name: 'Baseline', slug: 'baseline-actions' })
call('workspace_member_add', 'base-owner', { ...FW, user_id: 'base-reader' })
call('create_channel', 'base-owner', { ...FC, name: 'general' })
call('join_channel', 'base-reader', FC)
const fallback = 'uid-' + Buffer.from('base-reader').toString('hex')
for (const [send, edit, remove, field] of [['message_send','message_edit','message_delete','body'], ['send_message','edit_message','delete_message','content']]) {
 const scope = { ...FC, message_id: send + '-baseline' }
 fixedNow = ++clock
 call(send, 'base-owner', { ...scope, [field]: 'hello @' + fallback })
 ok(db.prepare('SELECT count(*) AS n FROM mentions WHERE message_id=?').get(scope.message_id).n === 1, send + ' extracts default-handle mention')
 denied(send, 'base-owner', { ...scope, [field]: 'retry' })
 call('acknowledge_mention','base-reader',scope)
 const originalSeen = db.prepare('SELECT seen_at FROM mentions WHERE message_id=?').get(scope.message_id).seen_at
 call(edit, 'base-owner', { ...scope, [field]: 'edited @' + fallback })
 denied(edit, 'base-owner', { ...scope, [field]: 'edited @' + fallback })
 ok(db.prepare('SELECT seen_at FROM mentions WHERE message_id=?').get(scope.message_id).seen_at === originalSeen, edit + ' same-clock retry preserves seen state')
 failWriteTo = 'finalize'
 let failed = false
 try { call(edit, 'base-owner', { ...scope, [field]: 'remove recipient' }) } catch { failed = true }
 failWriteTo = null
 ok(failed && db.prepare('SELECT count(*) AS n FROM mentions WHERE message_id=?').get(scope.message_id).n === 1, edit + ' rolls back derived cleanup on later failure')
 call(remove, 'base-owner', scope)
 denied(remove, 'base-owner', scope)
 ok(db.prepare('SELECT count(*) AS n FROM mentions WHERE message_id=?').get(scope.message_id).n === 0, remove + ' removes mention rows')
 fixedNow = null
}
ok(db.prepare('PRAGMA foreign_key_check').all().length === 0, 'all action batches preserve foreign keys')
ok(db.prepare('SELECT count(*) AS n FROM audit_log a LEFT JOIN activity_log l ON l.id=a.id WHERE l.id IS NULL').get().n === 0, 'all successful actions mirror activity exactly once')
ok(db.prepare("SELECT count(*) AS n FROM activity_log WHERE changes != '{}'").get().n === 0, 'all operation markers finalized')
console.log('Passed ' + checks + ' assertions across all '+Object.keys(TOOLS).length+' actions.')
