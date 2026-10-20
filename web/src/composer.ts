import type { KeyboardEvent } from 'react'

// Shared by channel and thread composers; composing IME text must never send.
export function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
    event.preventDefault()
    event.currentTarget.form?.requestSubmit()
  }
}
