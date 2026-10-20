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
      if (!await action()) throw new Error('Change refused. Your permissions or membership may have changed.')
      setMembers(await getWorkspaceMembers(workspace.id))
    } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  async function viewProfile(user_id: string) {
    setError('')
    try {
      const rows = await getMemberProfile({ workspace_id: workspace.id, user_id })
      if (!rows[0]) throw new Error('Profile is no longer available.')
      setProfile(rows[0])
    } catch (err) { setError(errorText(err)) }
  }
  function saveProfile(event: FormEvent) {
    event.preventDefault()
    void change(() => updateMyProfile({ workspace_id: workspace.id, display_name: name.trim() }))
  }
  return <main id="conversation"><h2>Members</h2>
    {error && <p role="alert">{error}</p>}{loading && <p role="status">Loading members…</p>}
    <ul className="member-list">{members.map(member => <li key={member.user_id}>
      <button onClick={() => void viewProfile(member.user_id)}>{member.display_name}</button>
      <span className="role-badge">{member.role}</span>
      {workspace.role === 'owner' && member.role !== 'owner' && <label>Role for {member.display_name}
        <select value={member.role} disabled={busy} onChange={event => {
          const role = event.target.value
          if (role === 'admin' || role === 'member') void change(() => updateMemberRole({ workspace_id: workspace.id, user_id: member.user_id, role }))
        }}><option value="admin">Admin</option><option value="member">Member</option></select></label>}
      {member.role !== 'owner' && member.user_id !== myId && (workspace.role === 'owner' || (workspace.role === 'admin' && member.role === 'member')) &&
        <button disabled={busy} onClick={() => {
          if (window.confirm(`Remove ${member.display_name} from this workspace?`)) void change(() => removeMember({ workspace_id: workspace.id, user_id: member.user_id }))
        }}>Remove {member.display_name}</button>}
    </li>)}</ul>
    {!loading && <form className="slackie-form" onSubmit={saveProfile}><label>Your display name
      <input required maxLength={80} value={name} onChange={event => setName(event.target.value)} /></label>
      <button disabled={busy || !name.trim()}>Save display name</button></form>}
    {profile && <Modal title={profile.display_name} onClose={() => setProfile(null)}>
      <p>Role: {profile.role}</p><p>Member since {new Date(profile.joined_at).toLocaleDateString()}</p>
    </Modal>}
  </main>
}
