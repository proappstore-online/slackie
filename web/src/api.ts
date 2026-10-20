import { initPro } from '@proappstore/sdk'
export const app = initPro({ appId: 'slackie', authMode: 'platform-cookie' })
export const CHANNEL_TYPES = ['public', 'private'] as const
// UI capability vocabulary; SQL roles enforce permissions, never these constants.
export const PERMISSION_KEYS = ['manage_members', 'manage_channels', 'moderate_messages'] as const
export const ROLES = ['owner', 'admin', 'member'] as const
export type Role = (typeof ROLES)[number]
export interface Workspace { id: string; name: string; slug: string; role: Role }
export interface Channel { id: string; workspace_id: string; name: string; description: string; is_private: number; is_archived: number; is_member: number }
export interface Message { id: string; user_id: string; body: string; created_at: number; edited_at: number | null; deleted_at: number | null }
export async function query<T>(name: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const result = await app.actions.call<{ rows: T[] }>(name, params)
  return result.rows
}
export async function batch(name: string, params: Record<string, unknown>): Promise<number[]> {
  const result = await app.actions.call<{ results: { meta: { changes: number } }[] }>(name, params)
  return result.results.map(row => row.meta.changes)
}
export const errorText = (error: unknown) => error instanceof Error ? error.message : 'Request failed. Please retry.'
