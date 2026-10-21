import { t, message } from './strings'
import { useState, type FormEvent } from 'react'
import { archiveChannel, errorText, getChannelMembers, getWorkspaceMembers, inviteToChannel, updateChannel, type Channel, type Member, type Workspace } from './api'
import { Modal } from './Modal'

export function ChannelDetails({ channel, role, onChanged }: { channel: Channel; role: Workspace['role']; onChanged: () => Promise<void> }) {
  const [expanded, setExpanded] = useState(false)
  const [mode, setMode] = useState<'edit' | 'members' | null>(null)
  const [name, setName] = useState(channel.name)
  const [topic, setTopic] = useState(channel.topic)
  const [description, setDescription] = useState(channel.description)
  const [members, setMembers] = useState<Member[]>([])
  const [workspaceMembers, setWorkspaceMembers] = useState<Member[]>([])
  const [invitee, setInvitee] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const params = { workspace_id: channel.workspace_id, channel_id: channel.id }
  async function openMembers() {
    setError(''); setBusy(true)
    try {
      const [rows, all] = await Promise.all([getChannelMembers(params), getWorkspaceMembers(channel.workspace_id)])
      setMembers(rows); setWorkspaceMembers(all); setMode('members')
    } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      await updateChannel({ ...params, name: name.trim(), topic, description })
      await onChanged(); setMode(null)
    } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  async function archive() {
    if (!window.confirm(message('confirmArchive', { name: channel.name }))) return
    setBusy(true); setError('')
    try {
      if (!await archiveChannel(params)) throw new Error(t("archiveRefusedOrAlreadyArchived"))
      await onChanged()
    } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  async function invite(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      if (!await inviteToChannel({ ...params, user_id: invitee })) throw new Error(t("inviteRefusedOrMemberAlreadyJoined"))
      setMembers(await getChannelMembers(params)); setInvitee(''); await onChanged()
    } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  const mayManage = role !== 'member' && (!channel.is_private || !!channel.is_member)
  return <section aria-label={t("channelSettings")} className={expanded ? "channel-settings expanded" : "channel-settings"}>
    {(channel.is_member || mayManage) && <button className="mobile-channel-actions" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{t("channelActions")}</button>}
    <div className="channel-action-buttons">
    {(channel.is_member || mayManage) && <button disabled={busy} onClick={() => void openMembers()}>{t("channelMembers")}</button>}
    {mayManage && !channel.is_archived && <>
      <button onClick={() => { setName(channel.name); setTopic(channel.topic); setDescription(channel.description); setMode('edit') }}>{t("editChannel")}</button>
      <button disabled={busy} onClick={() => void archive()}>{t("archiveChannel")}</button>
    </>}</div>{error && !mode && <p role="alert">{error}</p>}
    {mode && <Modal title={mode === 'edit' ? t("editChannel") : t("channelMembers")} onClose={() => { setMode(null); setError('') }}>
      {error && <p role="alert">{error}</p>}
      {mode === 'edit' ? <form onSubmit={save} className="slackie-form">
        <label>{t("name")}<input required maxLength={80} value={name} onChange={event => setName(event.target.value)} /></label>
        <label>{t("topic")}<input maxLength={250} value={topic} onChange={event => setTopic(event.target.value)} /></label>
        <label>{t("description")}<textarea dir="auto" lang="" maxLength={1000} value={description} onChange={event => setDescription(event.target.value)} /></label>
        <button disabled={busy}>{t("saveChannel")}</button>
      </form> : <><ul>{members.map(member => <li key={member.user_id}><bdi>{member.display_name}</bdi> · {t(member.role)}</li>)}</ul>
        {!channel.is_archived && (channel.is_member || mayManage) && <form onSubmit={invite} className="slackie-form">
          <label>{t("inviteWorkspaceMember")}<select required value={invitee} onChange={event => setInvitee(event.target.value)}>
            <option value="">{t("chooseAMember")}</option>{workspaceMembers.filter(row => !members.some(member => member.user_id === row.user_id)).map(row => <option key={row.user_id} value={row.user_id}>{row.display_name}</option>)}
          </select></label><button disabled={busy || !invitee}>{t("inviteToChannel")}</button>
        </form>}
      </>}
    </Modal>}
  </section>
}
