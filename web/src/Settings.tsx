import { t } from './strings'
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
      if (!await updateWorkspace({ workspace_id: workspace.id, name: name.trim() })) throw new Error(t("updateRefusedOrNameUnchangedOnlyTheOwnerCan"))
      await onChanged(); setSaved(true)
    } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  return <main id="conversation"><h2>{t("workspaceSettings")}</h2>
    <form onSubmit={submit} className="slackie-form"><label>{t("workspaceName")}<input required maxLength={100} value={name} readOnly={workspace.role !== 'owner'} onChange={event => { setName(event.target.value); setSaved(false) }} />
    </label>{workspace.role === 'owner' ? <button disabled={busy || !name.trim() || name.trim() === workspace.name}>{t("saveWorkspaceName")}</button>
      : <p>{t("onlyTheWorkspaceOwnerCanChangeTheName")}</p>}</form>
    {error && <p role="alert">{error}</p>}{saved && <p role="status">{t("workspaceNameSaved")}</p>}
  </main>
}
