import { useEffect, useState, type FormEvent } from 'react'
import { errorText, updateWorkspace, type Workspace } from './api'

export function Settings({ workspace, onChanged }: { workspace: Workspace; onChanged: () => Promise<void> }) {
  const [name, setName] = useState(workspace.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  useEffect(() => { setName(workspace.name) }, [workspace.name])
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setSaved(false)
    try {
      if (!await updateWorkspace({ workspace_id: workspace.id, name: name.trim() })) throw new Error('Update refused or name unchanged. Only the owner can rename this workspace.')
      await onChanged(); setSaved(true)
    } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  return <main id="conversation"><h2>Workspace settings</h2>
    <form onSubmit={submit} className="slackie-form"><label>Workspace name
      <input required maxLength={100} value={name} readOnly={workspace.role !== 'owner'} onChange={event => { setName(event.target.value); setSaved(false) }} />
    </label>{workspace.role === 'owner' ? <button disabled={busy || !name.trim() || name.trim() === workspace.name}>Save workspace name</button>
      : <p>Only the workspace owner can change the name.</p>}</form>
    {error && <p role="alert">{error}</p>}{saved && <p role="status">Workspace name saved.</p>}
  </main>
}
