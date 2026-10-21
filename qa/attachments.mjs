import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createAttachmentService } from '../server/attachments.mjs'

function fixture() {
  const rows = new Map(), bytes = new Map()
  const members = new Set(['owner', 'reader', 'admin'])
  let user = 'owner', clock = 1000, archived = false, uploads = 0
  const storage = {
    async upload(path, blob) { uploads++; bytes.set(path, blob) },
    async download(path) { return new Response(bytes.get(path) ?? null, { status: bytes.has(path) ? 200 : 404 }) },
    async delete(path) { bytes.delete(path) },
  }
  const metadata = {
    async get(id) { return rows.get(id) },
    async insert(row) { rows.set(row.id, { ...row }) },
    async markDeleted(id, _user, at) { rows.get(id).deletedAt = at },
  }
  const options = {
    storage, metadata,
    channels: { async get(id) { return id === 'channel' ? { workspaceId: 'workspace', archived } : null } },
    membership: {
      async isMember(workspace, channel, id) { return workspace === 'workspace' && channel === 'channel' && members.has(id) },
      async isAdmin(workspace, id) { return workspace === 'workspace' && id === 'admin' },
    },
    currentUser: async () => user, signingKey: new Uint8Array(32).fill(7),
    downloadBaseUrl: 'https://example.test/attachments/download', now: () => clock,
    newId: () => 'attachment-1',
  }
  const service = createAttachmentService(options)
  return { service, options, rows, bytes, members, storage, metadata,
    as(id) { user = id }, tick() { clock += 60_000 }, archive() { archived = true },
    uploads: () => uploads,
    share: () => service.shareAttachment(new File(['hello'], 'note.txt', { type: 'text/plain' }), 'channel', 'owner'),
  }
}
const denied = status => error => error.status === status
const token = url => new URL(url).searchParams.get('token')

test('private upload stores canonical metadata without exposing a private path', async () => {
  const f = fixture(), row = await f.share()
  assert.equal(row.ownerId, 'owner'); assert.equal(row.workspaceId, 'workspace')
  assert.equal(row.channelId, 'channel'); assert.equal(row.name, 'note.txt')
  assert.equal(row.size, 5); assert.equal(row.contentType, 'text/plain')
  assert.equal(row.path, undefined); assert.equal(f.bytes.size, 1)
  assert.equal(f.rows.get(row.id).path, `attachments/${row.id}`)
})
test('current channel member receives a token and downloads private bytes', async () => {
  const f = fixture(), row = await f.share(); f.as('reader')
  const url = await f.service.getAttachmentUrl(row.id, 'reader')
  const response = await f.service.downloadAttachment(token(url), 'reader')
  assert.equal(await response.text(), 'hello')
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.equal(response.headers.get('content-disposition'), 'attachment')
})
test('outsider cannot upload or obtain a token', async () => {
  const f = fixture(), row = await f.share(); f.as('outsider')
  await assert.rejects(f.service.getAttachmentUrl(row.id, 'outsider'), denied(404))
  await assert.rejects(f.service.shareAttachment(new Blob(['x'], { type: 'text/plain' }), 'channel', 'outsider'), denied(403))
  assert.equal(f.uploads(), 1)
})
test('anonymous and spoofed identities cannot use any service operation', async () => {
  const f = fixture(); f.as(null)
  await assert.rejects(f.share(), denied(401))
  await assert.rejects(f.service.getAttachmentUrl('x', 'owner'), denied(401))
  await assert.rejects(f.service.downloadAttachment('x', 'owner'), denied(401))
  await assert.rejects(f.service.deleteAttachment('x', 'owner'), denied(401))
  f.as('reader')
  await assert.rejects(f.share(), denied(403))
  await assert.rejects(f.service.getAttachmentUrl('x', 'owner'), denied(403))
  await assert.rejects(f.service.deleteAttachment('x', 'owner'), denied(403))
})
test('revocation invalidates an already issued token', async () => {
  const f = fixture(), row = await f.share(); f.as('reader')
  const value = token(await f.service.getAttachmentUrl(row.id, 'reader'))
  f.members.delete('reader')
  await assert.rejects(f.service.downloadAttachment(value, 'reader'), denied(404))
  await assert.rejects(f.service.getAttachmentUrl(row.id, 'reader'), denied(404))
})
test('tokens cannot be transferred to another authenticated member', async () => {
  const f = fixture(), row = await f.share()
  const value = token(await f.service.getAttachmentUrl(row.id, 'owner')); f.as('reader')
  await assert.rejects(f.service.downloadAttachment(value, 'reader'), denied(404))
})
test('expired, malformed and forged tokens are rejected', async () => {
  const f = fixture(), row = await f.share()
  const value = token(await f.service.getAttachmentUrl(row.id, 'owner'))
  for (const invalid of [null, '', 'x.y', `${value}x`, `${value}.extra`, 'x'.repeat(4097)]) {
    await assert.rejects(f.service.downloadAttachment(invalid, 'owner'), denied(404))
  }
  f.tick()
  await assert.rejects(f.service.downloadAttachment(value, 'owner'), denied(404))
})
test('owner deletion tombstones metadata, removes bytes and revokes tokens', async () => {
  const f = fixture(), row = await f.share()
  const value = token(await f.service.getAttachmentUrl(row.id, 'owner'))
  await f.service.deleteAttachment(row.id, 'owner')
  assert.equal(f.bytes.size, 0); assert.equal(f.rows.get(row.id).deletedAt, 1000)
  await assert.rejects(f.service.downloadAttachment(value, 'owner'), denied(404))
})
test('ordinary non-owner cannot delete but current workspace admin in channel can', async () => {
  const f = fixture(), row = await f.share(); f.as('reader')
  await assert.rejects(f.service.deleteAttachment(row.id, 'reader'), denied(403))
  assert.equal(f.bytes.size, 1)
  f.as('admin'); await f.service.deleteAttachment(row.id, 'admin')
  assert.equal(f.bytes.size, 0)
})
test('admin outside the channel has no deletion bypass', async () => {
  const f = fixture(), row = await f.share(); f.members.delete('admin'); f.as('admin')
  await assert.rejects(f.service.deleteAttachment(row.id, 'admin'), denied(404))
})
test('invalid files, unknown channels and archive deny before storage', async () => {
  const f = fixture()
  for (const file of [new Blob(), new Blob(['x'], { type: 'text/html' }), new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: 'text/plain' })]) {
    await assert.rejects(f.service.shareAttachment(file, 'channel', 'owner'), denied(400))
  }
  await assert.rejects(f.service.shareAttachment(new Blob(['x']), 'other', 'owner'), denied(403))
  f.archive(); await assert.rejects(f.share(), denied(403))
  assert.equal(f.uploads(), 0)
})
test('membership lost during upload prevents metadata publication and cleans bytes', async () => {
  const f = fixture(), upload = f.storage.upload
  f.storage.upload = async (...args) => { await upload(...args); f.members.delete('owner') }
  await assert.rejects(f.share(), denied(404))
  assert.equal(f.rows.size, 0); assert.equal(f.bytes.size, 0)
})
test('metadata write failure cleans private staged bytes', async () => {
  const f = fixture(); f.metadata.insert = async () => { throw new Error('write failed') }
  await assert.rejects(f.share(), /write failed/)
  assert.equal(f.rows.size, 0); assert.equal(f.bytes.size, 0)
})
test('revocation during upstream fetch denies before returning response', async () => {
  const f = fixture(), row = await f.share(), download = f.storage.download
  const value = token(await f.service.getAttachmentUrl(row.id, 'owner'))
  f.storage.download = async path => { const response = await download(path); f.members.delete('owner'); return response }
  await assert.rejects(f.service.downloadAttachment(value, 'owner'), denied(404))
})
test('storage deletion failure still invalidates tokens', async () => {
  const f = fixture(), row = await f.share()
  const value = token(await f.service.getAttachmentUrl(row.id, 'owner'))
  f.storage.delete = async () => { throw new Error('storage unavailable') }
  await assert.rejects(f.service.deleteAttachment(row.id, 'owner'), /storage unavailable/)
  await assert.rejects(f.service.downloadAttachment(value, 'owner'), denied(404))
})
test('configuration rejects weak keys and unsafe download endpoints', () => {
  const f = fixture()
  assert.throws(() => createAttachmentService({ ...f.options, signingKey: new Uint8Array(8) }))
  for (const downloadBaseUrl of ['http://example.test', 'https://example.test/?x=1', 'https://user:pass@example.test/']) {
    assert.throws(() => createAttachmentService({ ...f.options, downloadBaseUrl }))
  }
})
