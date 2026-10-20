import { initPro } from '@proappstore/sdk'
export const app = initPro({ appId: 'slackie', authMode: 'platform-cookie' })
export const CHANNEL_TYPES = ['public', 'private'] as const
// UI capability vocabulary; SQL roles enforce permissions, never these constants.
export const PERMISSION_KEYS = ['manage_members', 'manage_channels', 'moderate_messages'] as const
export const ROLES = ['owner', 'admin', 'member'] as const
export type Role = (typeof ROLES)[number]
export interface Workspace { id: string; name: string; slug: string; role: Role }
export interface Channel { id: string; workspace_id: string; name: string; description: string; topic: string; archived_at: number | null; is_private: number; is_archived: number; is_member: number; can_leave: number }
export interface Reaction { emoji: string; count: number; reacted: number }
export interface Message { id: string; user_id: string; display_name: string | null; body: string; content: string; reactions: Reaction[]; created_at: number; edited_at: number | null; deleted_at: number | null }
export interface Member { user_id: string; display_name: string; role: Role; joined_at: number; avatar_url?: string | null }
export interface ChannelScope { workspace_id: string; channel_id: string }
export interface MessageScope extends ChannelScope { message_id: string }
export async function query<T>(name: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const result = await app.actions.call<{ rows: T[] }>(name, params)
  return result.rows
}
export async function batch(name: string, params: Record<string, unknown>): Promise<number[]> {
  const result = await app.actions.call<{ results: { meta: { changes: number } }[] }>(name, params)
  return result.results.map(row => row.meta.changes)
}
export const errorText = (error: unknown) => error instanceof Error ? error.message : 'Request failed. Please retry.'

async function write(name: string, params: Record<string, unknown>) {
  const changes = await batch(name, params)
  return changes[0] ?? 0
}
export const getChannels = (workspace_id: string) => query<Channel>('get_channels', { workspace_id })
export const createChannel = (params: ChannelScope & { name: string; description?: string; is_private?: number }) => batch('create_channel', { ...params })
export const updateChannel = (params: ChannelScope & { name: string; topic: string; description: string }) => write('update_channel', { ...params })
export const archiveChannel = (params: ChannelScope) => write('archive_channel', { ...params })
export const joinChannel = (params: ChannelScope) => write('join_channel', { ...params })
export const leaveChannel = (params: ChannelScope) => write('leave_channel', { ...params })
export const getChannelMembers = (params: ChannelScope) => query<Member>('get_channel_members', { ...params })
export const inviteToChannel = (params: ChannelScope & { user_id: string }) => write('invite_to_channel', { ...params })
export const sendMessage = (params: MessageScope & { content: string }) => write('send_message', { ...params })
export const editMessage = (params: MessageScope & { content: string }) => write('edit_message', { ...params })
export const deleteMessage = (params: MessageScope) => write('delete_message', { ...params })
export async function getMessages(params: ChannelScope & { before_id?: string }) {
  const rows = await query<Omit<Message, 'reactions'> & { reactions: string }>('get_messages', { ...params })
  return rows.map(row => ({ ...row, reactions: JSON.parse(row.reactions || '[]') as Reaction[] }))
}
export const addReaction = (params: MessageScope & { emoji: string }) => write('add_reaction', { ...params })
export const removeReaction = (params: MessageScope & { emoji: string }) => write('remove_reaction', { ...params })
export const getReactions = (params: MessageScope) => query<Reaction>('get_reactions', { ...params })
export const getWorkspaceMembers = (workspace_id: string) => query<Member>('get_workspace_members', { workspace_id })
export const updateMemberRole = (params: { workspace_id: string; user_id: string; role: 'admin' | 'member' }) => write('update_member_role', params)
export const removeMember = (params: { workspace_id: string; user_id: string }) => write('remove_member', params)
export const getMemberProfile = (params: { workspace_id: string; user_id: string }) => query<Member>('get_member_profile', params)
export const updateMyProfile = (params: { workspace_id: string; display_name: string }) => write('update_my_profile', params)
