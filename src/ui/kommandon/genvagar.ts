import { t } from '../sprak.js'

/**
 * Tangentbordsgenvägar som data.
 *
 * En genväg skrivs på ett kanoniskt sätt — `Mod+Shift+V`, `F2`, `Delete`,
 * `Mod+,` — och tolkas åt två håll: mot en tangenttryckning, för att köra
 * kommandot, och till text, för att visa den i menyer och i paletten. Att
 * samma sträng gör båda är hela poängen: förut stod `Ctrl+X` i cellmenyn
 * medan ingen tangenthanterare kände till X. En genväg som visas men inte
 * fungerar lär användaren att sluta läsa genvägarna.
 *
 * `Mod` är Ctrl på Windows och Linux, ⌘ på Mac. Det är det enda som skiljer
 * plattformarna åt, och det avgörs vid visningen, inte i kommandolistan.
 */
export type Genvag = string

interface Tolkad {
  mod: boolean
  shift: boolean
  alt: boolean
  /** Tangenten som `KeyboardEvent.key`, gemen för bokstäver. */
  key: string
}

const cache = new Map<Genvag, Tolkad>()

export function tolkaGenvag(genvag: Genvag): Tolkad {
  const fardig = cache.get(genvag)
  if (fardig) return fardig
  const delar = genvag.split('+')
  const key = delar[delar.length - 1]!
  const tolkad: Tolkad = {
    mod: delar.includes('Mod'),
    shift: delar.includes('Shift'),
    alt: delar.includes('Alt'),
    key: key.length === 1 ? key.toLowerCase() : key,
  }
  cache.set(genvag, tolkad)
  return tolkad
}

/** Sant när tangenttryckningen är precis den här genvägen — inga extra modifierare. */
export function matcharGenvag(e: KeyboardEvent, genvag: Genvag): boolean {
  const g = tolkaGenvag(genvag)
  const mod = e.ctrlKey || e.metaKey
  if (mod !== g.mod || e.shiftKey !== g.shift || e.altKey !== g.alt) return false
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
  return key === g.key
}

const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

const NAMN: Record<string, () => string> = {
  Delete: () => 'Delete',
  Escape: () => 'Esc',
  Enter: () => 'Enter',
  ArrowUp: () => '↑',
  ArrowDown: () => '↓',
}

/** Genvägen som text, på plattformens sätt: `Ctrl+Skift+V` eller `⌘⇧V`. */
export function visaGenvag(genvag: Genvag): string {
  const g = tolkaGenvag(genvag)
  const tangent = NAMN[g.key]?.() ?? (g.key.length === 1 ? g.key.toUpperCase() : g.key)
  if (MAC) {
    return `${g.mod ? '⌘' : ''}${g.alt ? '⌥' : ''}${g.shift ? '⇧' : ''}${tangent}`
  }
  const delar: string[] = []
  if (g.mod) delar.push('Ctrl')
  if (g.alt) delar.push('Alt')
  if (g.shift) delar.push(t('Skift'))
  delar.push(tangent)
  return delar.join('+')
}
