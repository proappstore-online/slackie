import { useExperience } from './ExperienceProvider'
import { formatTimestamp } from './experience'
import { t, message } from './strings'
import { useEffect, useState, type FormEvent } from 'react'
import { app, errorText, getMemberProfile, getWorkspaceMembers, removeMember, updateMemberRole, updateMyProfile, type Member, type Workspace } from './api'
import { Modal } from './Modal'

export function Members({ workspace }: { workspace: Workspace }) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<Member | null>(null)
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const myId = app.auth.user?.id
  useEffect(() => {
    let active = true
    getWorkspaceMembers(workspace.id).then(rows => { if (active) setMembers(rows) })
      .catch(err => { if (active) setError(errorText(err)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [workspace.id])
  async function change(action: () => Promise<number>) {
    setBusy(true); setError('')
    try {
      if (!await action()) throw new Error(t("changeRefusedYourPermissionsOrMembershipMayHaveChanged"))
      setMembers(await getWorkspaceMembers(workspace.id))
    } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  async function viewProfile(user_id: string) {
    setError('')
    try {
      const rows = await getMemberProfile({ workspace_id: workspace.id, user_id })
      if (!rows[0]) throw new Error(t("profileIsNoLongerAvailable"))
      setProfile(rows[0])
    } catch (err) { setError(errorText(err)) }
  }
  function saveProfile(event: FormEvent) {
    event.preventDefault()
    void change(() => updateMyProfile({ workspace_id: workspace.id, display_name: name.trim(), ...(handle.trim() ? { mention_handle: handle.trim() } : {}) }))
  }
  return <main id="conversation"><h2>{t("members")}</h2>
    {error && <p role="alert">{error}</p>}{loading && <p role="status">{t("loadingMembers")}</p>}
    <ul className="member-list">{members.map(member => <li key={member.user_id}>
      <button onClick={() => void viewProfile(member.user_id)}><bdi>{member.display_name}</bdi></button>
      <span className="role-badge">{t(member.role)}</span>
      {member.mention_handle && <span>{"@"}{member.mention_handle}</span>}
      {workspace.role === 'owner' && member.role !== 'owner' && <label>{message('roleForMember', { name: member.display_name })}
        <select value={t(member.role)} disabled={busy} onChange={event => {
          const role = event.target.value
          if (role === 'admin' || role === 'member') void change(() => updateMemberRole({ workspace_id: workspace.id, user_id: member.user_id, role }))
        }}><option value="admin">{t("admin")}</option><option value="member">{t("member")}</option></select></label>}
      {member.role !== 'owner' && member.user_id !== myId && (workspace.role === 'owner' || (workspace.role === 'admin' && member.role === 'member')) &&
        <button disabled={busy} onClick={() => {
          if (window.confirm(message('confirmRemove', { name: member.display_name }))) void change(() => removeMember({ workspace_id: workspace.id, user_id: member.user_id }))
        }}>{message('removeMember', { name: member.display_name })}</button>}
    </li>)}</ul>
    {!loading && <form className="slackie-form" onSubmit={saveProfile}><label>{t("yourDisplayName")}<input required maxLength={80} value={name} onChange={event => setName(event.target.value)} /></label>
      <label>{t("mentionHandle")}<input maxLength={32} pattern="[a-z0-9_-]{1,32}" value={handle} onChange={event => setHandle(event.target.value)} aria-describedby="handle-help" /></label>
      <small id="handle-help">{t("optionalUniqueLowercaseHandleUidIsReservedLeaveBlank")}</small>
      <button disabled={busy || !name.trim()}>{t("saveProfile")}</button></form>}
    {profile && <ProfileModal profile={profile} onClose={() => setProfile(null)} />}
  </main>
}

export function ProfileModal({ profile, onClose }: { profile: Member; onClose: () => void }) {
  return <Modal title={profile.display_name} onClose={onClose}><ProfileContent profile={profile} /></Modal>
}

function ProfileContent({ profile }: { profile: Member }) {
  const { preferences } = useExperience()
  return <><p>{t("role")} {t(profile.role)}</p>{profile.mention_handle && <p>{"@"}{profile.mention_handle}</p>}<p>{t("memberSince")} {formatTimestamp(profile.joined_at, preferences)}</p></>
}

export function OwnProfile({ workspace, onClose }: { workspace?: Workspace; onClose: () => void }) {
  const [profile, setProfile] = useState<Member | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    const user = app.auth.user
    if (workspace && user) void getMemberProfile({ workspace_id: workspace.id, user_id: user.id }).then(rows => {
      if (active) { if (rows[0]) setProfile(rows[0]); else setError(t("profileIsNoLongerAvailable")) }
    }).catch(err => { if (active) setError(errorText(err)) })
    return () => { active = false }
  }, [workspace?.id])
  return <Modal title={profile?.display_name ?? t("yourProfile")} onClose={onClose}>
    {profile ? <ProfileContent profile={profile} /> : error ? <p role="alert">{error}</p> : workspace ? <p role="status">{t("loadingProfile")}</p> : <p>{app.auth.user?.login}{t("createAWorkspaceToEstablishYourMemberProfile")}</p>}
  </Modal>
}
