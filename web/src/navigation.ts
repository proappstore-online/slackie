import { createContext, useContext, type Dispatch, type SetStateAction } from 'react'
export type MobileView = 'channels' | 'conversation' | 'thread'
type Context = { workspace: string; channel: string }
export const NavigationContext = createContext<{
  mobileView: MobileView
  setMobileView: Dispatch<SetStateAction<MobileView>>
  context: Context
  setContext: Dispatch<SetStateAction<Context>>
}>(null!)
export const useNavigation = () => useContext(NavigationContext)
