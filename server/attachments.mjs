import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

// Server-only service. Never import into the Vite client or expose its signing key.
// Adapters must use trusted authenticated identity and durable canonical metadata.
export class AttachmentError extends Error {
  constructor(status, message = 'Attachment unavailable.') {
    super(message)
    this.status = status
  }
}

export function createAttachmentService({
  storage, metadata, channels, membership, currentUser, signingKey, downloadBaseUrl,
  now = Date.now, newId = randomUUID,
}) {
  if (!(signingKey instanceof Uint8Array) || signingKey.byteLength < 32) {
    throw new Error('A server signing key of at least 32 bytes is required.')
  }
  // Copy so a caller cannot accidentally rotate the active key by mutating it.
  const key = Buffer.from(signingKey)
  const base = new URL(downloadBaseUrl)
  if (base.protocol !== 'https:' || base.search || base.hash || base.username || base.password) {
    throw new Error('A dedicated HTTPS download endpoint is required.')
  }
  const sign = value => createHmac('sha256', key).update(value).digest('base64url')
  async function identity(claimedId) {
    const userId = await currentUser()
    if (!userId) throw new AttachmentError(401)
    if (userId !== claimedId) throw new AttachmentError(403)
    return userId
  }
  async function authorize(row, userId) {
    if (!row || row.deletedAt !== null) throw new AttachmentError(404)
    // Adapter checks BOTH live workspace and channel membership; platform app
    // roles and client-supplied user IDs are never substitutes for these joins.
    if (!await membership.isMember(row.workspaceId, row.channelId, userId)) {
      throw new AttachmentError(404)
    }
  }
  async function getAuthorized(id, userId) {
    const row = await metadata.get(id)
    await authorize(row, userId)
    return row
  }
  return {
    async shareAttachment(file, channelId, userId) {
      await identity(userId)
      const channel = await channels.get(channelId)
      if (!channel || channel.archived || !await membership.isMember(channel.workspaceId, channelId, userId)) {
        throw new AttachmentError(403)
      }
      const types = new Set(['image/png', 'image/jpeg', 'application/pdf', 'text/plain'])
      if (!(file instanceof Blob) || !file.size || file.size > 10 * 1024 * 1024 || !types.has(file.type)) {
        throw new AttachmentError(400, 'Unsupported attachment type or size.')
      }
      const id = newId()
      const path = `attachments/${id}`
      const row = {
        id, path, workspaceId: channel.workspaceId, channelId, ownerId: userId,
        name: typeof file.name === 'string' ? file.name.replace(/[\x00-\x1f\x7f/\\]/g, '_').slice(0, 255) : 'attachment',
        size: file.size, contentType: file.type, createdAt: now(), deletedAt: null,
      }
      // storage must be a private SDK Storage adapter with a stable SERVER
      // principal. A caller-scoped browser Storage instance cannot share bytes.
      // Its adapter must validate actual bytes and quarantine/scan before return.
      await storage.upload(path, file, file.type)
      try {
        const latest = await channels.get(channelId)
        if (!latest || latest.workspaceId !== row.workspaceId || latest.archived) throw new AttachmentError(403)
        await authorize(row, userId)
        // Durable adapter must repeat authorization in the insert transaction.
        await metadata.insert(row)
      } catch (error) {
        // Cleanup failure propagates; a production adapter needs durable orphan
        // reconciliation. Without metadata, the private object is not served.
        await storage.delete(path)
        throw error
      }
      const { path: _privatePath, ...publicMetadata } = row
      return publicMetadata
    },
    async getAttachmentUrl(attachmentId, requestingUserId) {
      await identity(requestingUserId)
      await getAuthorized(attachmentId, requestingUserId)
      const payload = Buffer.from(JSON.stringify({ id: attachmentId, user: requestingUserId, exp: now() + 60_000 })).toString('base64url')
      const url = new URL(base)
      url.searchParams.set('token', `${payload}.${sign(payload)}`)
      return url.href
    },
    async downloadAttachment(token, requestingUserId) {
      await identity(requestingUserId)
      if (typeof token !== 'string' || token.length > 4096) throw new AttachmentError(404)
      const parts = token.split('.')
      if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0])) throw new AttachmentError(404)
      const expected = Buffer.from(sign(parts[0]))
      const actual = Buffer.from(parts[1])
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new AttachmentError(404)
      let claims
      try { claims = JSON.parse(Buffer.from(parts[0], 'base64url').toString()) } catch { throw new AttachmentError(404) }
      if (!claims || typeof claims.id !== 'string' || claims.user !== requestingUserId || !Number.isFinite(claims.exp) || claims.exp <= now()) {
        throw new AttachmentError(404)
      }
      const row = await getAuthorized(claims.id, requestingUserId)
      const response = await storage.download(row.path)
      if (!response.ok) throw new AttachmentError(404)
      // Recheck after upstream fetch, before handing any bytes to the caller.
      await getAuthorized(claims.id, requestingUserId)
      return new Response(response.body, { headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      } })
    },
    async deleteAttachment(attachmentId, requestingUserId) {
      await identity(requestingUserId)
      const row = await getAuthorized(attachmentId, requestingUserId)
      if (row.ownerId !== requestingUserId && !await membership.isAdmin(row.workspaceId, requestingUserId)) {
        throw new AttachmentError(403)
      }
      // Tombstone first to invalidate all outstanding tokens even if deletion
      // fails. Adapter must recheck membership/ownership in this transaction and
      // durably enqueue byte deletion for retry before returning.
      await metadata.markDeleted(row.id, requestingUserId, now())
      await storage.delete(row.path)
    },
  }
}
