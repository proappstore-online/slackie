// Transport status maps to bounded product text, never raw server internals.
export type RecoveryKind = 'offline' | 'denied' | 'rateLimited' | 'unavailable' | 'expiredInvite' | 'unknown'
export function recoveryKind(status?: number, online = true, invite = false): RecoveryKind {
  if (status === 401 || status === 403) return 'denied'
  if (invite && (status === 404 || status === 410)) return 'expiredInvite'
  if (status === 404 || status === 410) return 'unavailable'
  if (status === 429) return 'rateLimited'
  if (!online || status === 0 || (status !== undefined && status >= 500)) return 'offline'
  return 'unknown'
}
