import type { Column, Frame } from '../../core/types.js'
import { TOMT_FILTER } from '../../core/ops/filter.js'
import {
  notify,
  openFrame,
  sattDubbletter,
  sattFilter,
  sattSortering,
  setForhandsvisning,
  setViewSpec,
  sorteraOm,
  sorteringenArInaktuell,
  undo,
  type Tab,
} from '../../state/store.js'
import { tillampaForhandsvisning } from '../../state/edits.js'
import { DuplicateTool } from '../DuplicateTool.jsx'
import { FilterTool } from '../FilterTool.jsx'
import { Inspector } from '../Inspector.jsx'
import { SortTool } from '../SortTool.jsx'
import { celler, kolumner as kolumnerText, t } from '../sprak.js'
import { Verktyg } from '../verktyg.jsx'
import type { Handlingar } from './handlingar.js'
import type { SkalLage } from './lage.js'

/**
 * Högerpanelen: ett tabellverktyg, ett kolumnverktyg eller inspektören.
 *
 * Ett i taget, i den ordningen — se `oppnaTabellverktyg`.
 */
export function Hogerpanel({
  s,
  h,
  tab,
  frame,
  verktygKolumner,
  aktivKolumn,
}: {
  s: SkalLage
  h: Handlingar
  tab: Tab
  frame: Frame
  /** Verktygets kolumner, de som fortfarande finns. */
  verktygKolumner: Column[]
  aktivKolumn: Column | null
}) {
  const {
    rev,
    tabellverktyg,
    setTabellverktyg,
    verktyg,
    behall,
    setBehall,
    egnaBehallna,
    setEgnaBehallna,
  } = s
  const {
    tillampaUrval,
    taBortDubbletter,
    stangVerktyg,
    sattTyp,
    visaOgiltiga,
    dopOmKolumn,
    dupliceraKolumn,
    taBortKolumn,
    filtreraKolumn,
    oppnaVerktyg,
  } = h
  return (
    tabellverktyg === 'filter' ? (
      <FilterTool
        frame={frame}
        revision={rev}
        filter={tab.viewSpec.filter ?? TOMT_FILTER}
        startkolumn={tab.activeColumnId}
        onFilter={(f) => sattFilter(tab, f)}
        onTaBortSynliga={() => tillampaUrval(false)}
        onBehallSynliga={() => tillampaUrval(true)}
        onStang={() => setTabellverktyg(null)}
      />
    ) : tabellverktyg === 'dubbletter' ? (
      <DuplicateTool
        frame={frame}
        revision={rev}
        nyckel={tab.viewSpec.dubbletter ?? null}
        onNyckel={(n) => {
          setEgnaBehallna(new Map())
          sattDubbletter(tab, n)
        }}
        behall={behall}
        onBehall={setBehall}
        egnaVal={egnaBehallna.size}
        onTaBort={taBortDubbletter}
        onStang={() => setTabellverktyg(null)}
      />
    ) : tabellverktyg === 'sortera' ? (
      <SortTool
        frame={frame}
        nivaer={tab.viewSpec.sortering ?? []}
        inaktuell={sorteringenArInaktuell(tab)}
        aktivKolumn={tab.activeColumnId}
        onNivaer={(nivaer) => sattSortering(tab, nivaer)}
        onSorteraOm={() => sorteraOm(tab)}
        onStang={() => setTabellverktyg(null)}
      />
    ) : verktygKolumner.length > 0 && verktyg ? (
      <Verktyg
        namn={verktyg.id}
        kolumner={verktygKolumner}
        frame={frame}
        dataRevision={tab.dataRevision}
        visaBara={tab.viewSpec.visaBara}
        onVisaBara={(v) => setViewSpec(tab, { visaBara: v })}
        onForhandsvisning={(f) => setForhandsvisning(tab, f)}
        onTillampa={(f) => {
          const antal = tillampaForhandsvisning(tab, f)
          stangVerktyg()
          const forsta = f[0]
          if (!forsta) return
          const nya = f.reduce((n, x) => n + x.nyaKolumner.length, 0)
          notify(
            nya === 0
              ? `${forsta.etikett}${f.length > 1 ? ` i ${kolumnerText(f.length)}` : ''} — ${celler(antal)} skrevs om.`
              : `${forsta.etikett} — ${kolumnerText(nya)} med ${celler(antal)} ifyllda.`,
            { atgard: { etikett: t('Ångra'), kor: () => undo(tab) } },
          )
        }}
        onNyFlik={(resultat, text) => {
          // Ordningen spelar roll: panelen stängs medan den här fliken
          // ännu är den aktiva, så att förhandsvisningen städas bort
          // från rätt flik innan `openFrame` byter till den nya.
          stangVerktyg()
          openFrame(resultat)
          notify(text)
        }}
        onStang={stangVerktyg}
      />
    ) : (
      <Inspector
        frame={frame}
        column={aktivKolumn}
        revision={rev}
        onSetType={(t) => aktivKolumn && sattTyp(aktivKolumn.id, t)}
        onFilterInvalid={() => aktivKolumn && visaOgiltiga(aktivKolumn.id)}
        onRename={() => aktivKolumn && dopOmKolumn(aktivKolumn.id)}
        onDuplicate={() => aktivKolumn && dupliceraKolumn(aktivKolumn.id)}
        onDelete={() => aktivKolumn && taBortKolumn(aktivKolumn.id)}
        onFiltreraVarde={(varde) =>
          aktivKolumn &&
          filtreraKolumn(aktivKolumn.id, { operator: 'iLista', varden: [varde] })
        }
        onVerktyg={(namn) => aktivKolumn && oppnaVerktyg(namn, aktivKolumn.id)}
      />
    )
  )
}
