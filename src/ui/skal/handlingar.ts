import { useFiler } from './filer.js'
import { useKolumnatgarder } from './kolumnatgarder.js'
import type { SkalLage } from './lage.js'
import { useMallkolumner } from './mallkolumner.js'
import { useMarkering } from './markering.js'
import { useMenyposter } from './menyposter.js'
import { useRader } from './rader.js'
import { useStadverktyg } from './stadverktyg.js'
import { useVy } from './vy.js'

/**
 * Skalets handlingar, sektion för sektion.
 *
 * Varje sektion är en egen fil med samma rubrik som den hade i `App`:
 * Filer, Kolumnåtgärder, Vy, Markering och redigering, Rader, Städverktyg,
 * Mallkolumner, Menyer. De delar läget via `SkalLage` och varandra via det
 * som returneras här — i samma ordning som förr, så att de hooks som finns
 * inuti (`useMemo`, `useEffect`) körs i samma följd.
 */
export function useHandlingar(s: SkalLage) {
  const filer = useFiler(s)
  const kolumner = useKolumnatgarder(s)
  const vy = useVy(s)
  const markering = useMarkering({ ...s, ...filer })
  const rader = useRader(s)
  const verktyg = useStadverktyg(s)
  const mall = useMallkolumner(verktyg)
  const menyer = useMenyposter({
    ...s,
    ...kolumner,
    ...vy,
    ...markering,
    ...rader,
    ...verktyg,
    ...mall,
  })
  return { ...filer, ...kolumner, ...vy, ...markering, ...rader, ...verktyg, ...mall, ...menyer }
}

export type Handlingar = ReturnType<typeof useHandlingar>
