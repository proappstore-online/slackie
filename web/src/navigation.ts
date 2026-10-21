import { parseConversationLink, conversationSearch, type ConversationLink } from './experience'
import { createContext, useContext, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
export type MobileView = 'channels' | 'conversation' | 'thread'
type Context = { workspace: string; channel: string }
export const NavigationContext = createContext<{
  mobileView: MobileView
  setMobileView: Dispatch<SetStateAction<MobileView>>
  context: Context
  setContext: Dispatch<SetStateAction<Context>>
}>(null!)
export const useNavigation = () => useContext(NavigationContext)

// URLs contain resource identifiers only. Lists and thread actions remain the
// authority; a parsed link never grants access or supplies renderable content.
export function useConversationSearch() {
  const [search, setSearch] = useState(window.location.search)
  useEffect(() => {
    const changed = () => setSearch(window.location.search)
    window.addEventListener('popstate', changed)
    window.addEventListener('slackie:link', changed)
    return () => { window.removeEventListener('popstate', changed); window.removeEventListener('slackie:link', changed) }
  }, [])
  return parseConversationLink(search)
}
export function openConversationLink(link: ConversationLink) {
  window.history.pushState(null, '', conversationSearch(window.location.search, link) + window.location.hash)
  window.dispatchEvent(new Event('slackie:link'))
}
