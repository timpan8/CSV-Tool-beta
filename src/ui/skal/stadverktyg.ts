import { useEffect, useMemo } from 'preact/hooks'
import type { ColumnId } from '../../core/types.js'
import { nyRegelId, TOMT_FILTER, type Filterregel } from '../../core/ops/filter.js'
import { activeTab, sattFilter, setActiveColumn, setForhandsvisning } from '../../state/store.js'
import { inaktuellaRegler } from '../../state/regel.js'
import { stangVy } from '../../state/vylage.js'
import type { Verktygsnamn } from '../verktyg.jsx'
import { nuLage, type SkalLage } from './lage.js'

/* ---------- Städverktyg ---------- */

/** Panelerna till höger: kolumnverktygen och tabellverktygen, öppna och stänga. */
export function useStadverktyg({
  tab,
  rev,
  setVerktyg,
  setTabellverktyg,
}: Pick<SkalLage, 'tab' | 'rev' | 'setVerktyg' | 'setTabellverktyg'>) {
  const oppnaVerktyg = (namn: Verktygsnamn, colIds: ColumnId | ColumnId[]) => {
    const lista = Array.isArray(colIds) ? colIds : [colIds]
    const forsta = lista[0]
    if (forsta === undefined) return
    setActiveColumn(forsta)
    setTabellverktyg(null)
    stangVy('oversikt')
    setVerktyg({ id: namn, colIds: lista })
  }

  const stangVerktyg = () => {
    const nu = nuLage()
    if (nu) setForhandsvisning(nu.tab, null)
    setVerktyg(null)
  }

  // Högerpanelen rymmer ett verktyg i taget: att öppna sorteringen stänger
  // ett öppet kolumnverktyg, och därmed också dess förhandsvisning.
  const oppnaTabellverktyg = (namn: 'sortera' | 'filter' | 'dubbletter') => {
    const nu = nuLage()
    if (nu) setForhandsvisning(nu.tab, null)
    setVerktyg(null)
    setTabellverktyg(namn)
  }

  /**
   * Lägger till en regel på en kolumn och öppnar filterpanelen.
   *
   * Regeln läggs till i stället för att ersätta filtret — man bygger vidare
   * på det man redan har. `visaOgiltiga` är undantaget, se där.
   */
  const filtreraKolumn = (id: ColumnId, delta: Partial<Filterregel> = {}) => {
    const nu = nuLage()
    if (!nu) return
    const nuvarande = nu.tab.viewSpec.filter ?? TOMT_FILTER
    sattFilter(nu.tab, {
      ...nuvarande,
      regler: [
        ...nuvarande.regler,
        { id: nyRegelId(), colId: id, operator: 'ar', varde: '', ...delta },
      ],
    })
    setActiveColumn(id)
    oppnaTabellverktyg('filter')
  }

  /**
   * Mallkolumnerna som släpat efter, som en mängd för rutnätet.
   *
   * Räknas en gång per omritning och inte en gång per ritad rubrik.
   * `regellagen` har sin egen cache på `dataRevision`, så själva avtrycket
   * räknas bara när datat faktiskt ändrats.
   */
  const inaktuellaRegelIder = useMemo(
    () => new Set(tab ? inaktuellaRegler(tab).map((r) => r.col.id) : []),
    [tab, rev],
  )

  // Ett öppet verktyg hör till sin flik. Byter man flik städas både panelen
  // och förhandsvisningen bort från den flik man lämnar — annars skulle den
  // ligga kvar och ritas nästa gång man kom tillbaka, utan panel som
  // förklarar den.
  useEffect(() => {
    const lamnad = activeTab.value
    if (!lamnad) return
    return () => {
      setForhandsvisning(lamnad, null)
      setVerktyg(null)
      setTabellverktyg(null)
    }
  }, [tab?.id])

  return { oppnaVerktyg, stangVerktyg, oppnaTabellverktyg, filtreraKolumn, inaktuellaRegelIder }
}
