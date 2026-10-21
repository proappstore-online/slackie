import { t } from './strings'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { preferenceKey, readPreferences, resolvePreferences, validLocale, validTimeZone, messageSummary, type Preferences } from './experience'

const ExperienceContext = createContext<{
  preferences: Preferences
  update: (value: Preferences) => void
  announce: (count: number) => void
  clearAnnouncements: () => void
}>(null!)
export const useExperience = () => useContext(ExperienceContext)
export function ExperienceProvider({ children }: { children: ReactNode }) {
  const defaults = () => {
    try { return readPreferences(localStorage, navigator.language, Intl.DateTimeFormat().resolvedOptions().timeZone) }
    catch { return resolvePreferences(null, navigator.language) }
  }
  const [preferences, setPreferences] = useState(defaults)
  const pendingCount = useRef(0)
  const [announcement, setAnnouncement] = useState({ text: '', sequence: 0 })
  const current = useRef(preferences)
  current.current = preferences
  const clearAnnouncements = () => { pendingCount.current = 0; setAnnouncement(current => ({ text: '', sequence: current.sequence + 1 })) }
  useEffect(() => {
    const timer = window.setInterval(() => {
      const count = pendingCount.current
      pendingCount.current = 0
      setAnnouncement(previous => ({ text: count && current.current.announceMessages && !document.hidden ? messageSummary(count, current.current) : '', sequence: previous.sequence + 1 }))
    }, 5000)
    const visibility = () => clearAnnouncements()
    document.addEventListener('visibilitychange', visibility)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visibility) }
  }, [])
  useEffect(() => { if (!preferences.announceMessages) clearAnnouncements() }, [preferences.announceMessages])
  useEffect(() => {
    // English is the only shipped catalogue. Content language is independent.
    document.documentElement.lang = 'en'
    document.documentElement.dir = 'ltr'
    const sync = (event: StorageEvent) => { if (event.key === preferenceKey || event.key === null) setPreferences(defaults()) }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  function update(value: Preferences) {
    setPreferences(value)
    try { localStorage.setItem(preferenceKey, JSON.stringify(value)) } catch { /* Usable in memory when storage is unavailable. */ }
  }
  return <ExperienceContext.Provider value={{ preferences, update, announce: count => { if (current.current.announceMessages && !document.hidden) pendingCount.current += count }, clearAnnouncements }}>{children}<div className="sr-only" role="status" aria-live="polite" aria-atomic="true"><span key={announcement.sequence}>{announcement.text}</span></div></ExperienceContext.Provider>
}

export function ExperienceSettings() {
  const { preferences, update } = useExperience()
  const [locale, setLocale] = useState(preferences.locale)
  const [zone, setZone] = useState(preferences.timeZone)
  const [saved, setSaved] = useState(false)
  useEffect(() => { setLocale(preferences.locale); setZone(preferences.timeZone) }, [preferences.locale, preferences.timeZone])
  const localeValid = !!validLocale(locale), zoneValid = !!validTimeZone(zone)
  return <details className="experience-settings"><summary>{t("experiencePreferences")}</summary>
    <p>{t("interfaceLanguageEnglishPreferencesApplyToThisBrowserPrivate")}</p>
    <form className="slackie-form" onSubmit={event => {
      event.preventDefault()
      if (localeValid && zoneValid) { update({ ...preferences, locale: validLocale(locale)!, timeZone: validTimeZone(zone)! }); setSaved(true) }
    }}>
      <label>{t("formattingLocale")}<input value={locale} aria-invalid={!localeValid} aria-describedby="locale-help" onChange={event => { setLocale(event.target.value); setSaved(false) }} /></label>
      <small id="locale-help">{t("useALanguageTagSuchAsEnAUFr")}</small>
      <label>{t("timeZone")}<input value={zone} aria-invalid={!zoneValid} aria-describedby="zone-help" onChange={event => { setZone(event.target.value); setSaved(false) }} /></label>
      <small id="zone-help">{t("useAnIANATimeZoneSuchAsAustraliaMelbourne")}</small>
      <button aria-label={t("saveFormattingPreferences")} disabled={!localeValid || !zoneValid}>{t("saveFormattingPreferences")}</button>
      {saved && <p role="status">{t("formattingPreferencesSaved")}</p>}
    </form>
    <label><input type="checkbox" checked={preferences.sendOnEnter} onChange={event => update({ ...preferences, sendOnEnter: event.target.checked })} />{t("enterSendsMessages")}</label>
    <label><input type="checkbox" checked={preferences.announceMessages} onChange={event => update({ ...preferences, announceMessages: event.target.checked })} />{t("announceNewMessageCounts")}</label>
    <p>{t("shiftEnterInsertsALineCtrlEnterOrCommand")}</p>
    <p>{t("keyboardTabAndShiftTabMoveBetweenControlsEnter")}</p>
  </details>
}
