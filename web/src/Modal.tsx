import { t } from './strings'
import { useEffect, useId, useRef, type ReactNode } from 'react'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null)
  const id = useId()
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    return () => {
      dialog.close()
      // React StrictMode reopens the dialog once during development. Restore
      // focus only when it remains closed, using the original opener.
      queueMicrotask(() => { if (!dialog.open) { const target = opener.current?.isConnected ? opener.current : document.getElementById('channel-navigation') ?? document.querySelector<HTMLElement>('.workspace-controls select, #conversation'); target?.focus() } })
    }
  }, [])
  return <dialog ref={ref} aria-labelledby={id} onCancel={event => { event.preventDefault(); onClose() }}>
    <header className="slackie-header"><h2 id={id} dir="auto">{title}</h2><button onClick={onClose}>{t("close")}</button></header>
    {children}
  </dialog>
}
