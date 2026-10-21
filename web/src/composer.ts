import type { KeyboardEvent } from 'react'
import { shouldSubmit } from './experience'

export function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>, sendOnEnter = true) {
  if (shouldSubmit(event.key, event.shiftKey, event.nativeEvent.isComposing, event.ctrlKey, event.metaKey, sendOnEnter)) {
    event.preventDefault()
    event.currentTarget.form?.requestSubmit()
  }
}
