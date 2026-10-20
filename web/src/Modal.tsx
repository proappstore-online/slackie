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
      queueMicrotask(() => { if (!dialog.open && opener.current?.isConnected) opener.current.focus() })
    }
  }, [])
  return <dialog ref={ref} aria-labelledby={id} onCancel={event => { event.preventDefault(); onClose() }}>
    <header className="slackie-header"><h2 id={id}>{title}</h2><button onClick={onClose}>Close</button></header>
    {children}
  </dialog>
}
