import type { Column } from '../../core/types.js'
import { findColumn } from '../../core/frame/frame.js'
import { TOMT_FILTER } from '../../core/ops/filter.js'
import { beskrivSortering } from '../../core/ops/sort.js'
import {
  clearViewSpec,
  rensaSortering,
  sattFilter,
  setViewSpec,
  sorteraOm,
  sorteringenArInaktuell,
  verktygsfalt,
  viewIsLimited,
} from '../../state/store.js'
import { verkstadForFlik } from '../../state/matchning.js'
import { stangVy } from '../../state/vylage.js'
import { Filterrad } from '../Filterrad.jsx'
import { Meny, Toastar } from '../parts.jsx'
import { SearchBar } from '../SearchBar.jsx'
import { t, tf } from '../sprak.js'
import { Statusrad } from '../Statusrad.jsx'
import { Dialoger } from './Dialoger.jsx'
import { Flikrad } from './Flikrad.jsx'
import { useHandlingar } from './handlingar.js'
import { Innehall } from './Innehall.jsx'
import { useSkalLage } from './lage.js'
import { byggRedigeringsfalt } from './Redigeringsrad.jsx'
import { byggRegister } from './register.js'
import { useTangentbord } from './tangentbord.js'
import { useUppstart } from './uppstart.js'
import { useUrklipp } from './urklipp.js'
import { Verktygsrad } from './Verktygsrad.jsx'

/**
 * Skalet: hela appens ram.
 *
 * Här kopplas tillståndet (`useSkalLage`), handlingarna (`useHandlingar`),
 * fönsterlyssnarna och registret ihop, och här ritas layouten. Själva
 * innehållet bor i var sin fil under `skal/`.
 */
export function Skal() {
  const s = useSkalLage()
  const {
    tab,
    frame,
    vy,
    sokOppen,
    setSokOppen,
    laddar,
    meny,
    setMeny,
    palettFil,
    slappOver,
    verktyg,
    setBorjaOmOppen,
    lagen,
  } = s


  const h = useHandlingar(s)
  const {
    markering,
    synligaKolumner,
    oppnaFiler,
    flyttaMarkering,
    oppnaTabellverktyg,
    stangEgnaVyer,
    aterta,
    uppdateraMallkolumner,
    radmenyposter,
  } = h

  useTangentbord({ ...s, ...h })
  useUrklipp({ ...s, ...h })
  useUppstart(h)

  const aktivKolumn =
    frame && tab?.activeColumnId ? (findColumn(frame, tab.activeColumnId) ?? null) : null
  // En kolumn kan ha tagits bort medan verktyget stod öppet; den faller då
  // bort ur listan, och försvinner den sista stängs panelen.
  const verktygKolumner =
    frame && verktyg
      ? verktyg.colIds
          .map((id) => findColumn(frame, id))
          .filter((c): c is Column => c !== undefined)
      : []
  const begransad = viewIsLimited(tab)
  /*
   * Kolumnen palettens kommandon gäller.
   *
   * Markeringen går före den aktiva kolumnen: står markören i Ort ska
   * paletten erbjuda "Dölj Ort", inte den kolumn man senast klickade på i
   * rubrikraden. Den aktiva kolumnen är reserven, för när ingenting är
   * markerat.
   */
  const palettKolumn =
    (markering ? synligaKolumner[markering.fokusKol] : undefined) ?? aktivKolumn
  const egenVy = vy !== 'rutnat'

  /*
   * Escape stänger vyn som är uppe. Det finns bara en: `vylage` är ett enda
   * värde, så ingen vy kan ligga dold under den som syns, och det finns
   * ingen ordning att hålla i synk med ritningen nedan.
   */
  lagen.current.stangEgenVy = egenVy ? () => stangVy() : null

  const redigeringsfalt = byggRedigeringsfalt({ ...s, ...h, egenVy })

  /*
   * Registret byggs vid varje ritning, ur det läge som gäller just nu, och
   * läggs i `lagen` så att tangenthanteraren och menyerna — som är stängningar
   * från en tidigare ritning — alltid kör den färska listan.
   */
  lagen.current.kommandon = byggRegister({ ...s, ...h, palettKolumn, begransad })

  return (
    <div class="app">
      <Verktygsrad {...s} {...h} egenVy={egenVy} />

      <Flikrad {...s} />

      {verktygsfalt.value === 'rad' && redigeringsfalt}

      {sokOppen && tab && frame && !egenVy && (
        <SearchBar
          varde={tab.viewSpec.search ?? ''}
          traffar={frame.view.length}
          totalt={frame.rowCount}
          kolumnerMedTraff={tab.kolumnerMedTraff}
          onSok={(fraga) => setViewSpec(tab, { search: fraga })}
          onStang={() => {
            setSokOppen(false)
            clearViewSpec(tab)
          }}
          onNasta={() => flyttaMarkering(1, 0, false, false)}
        />
      )}

      {tab && frame && !egenVy && (
        <Filterrad
          frame={frame}
          filter={tab.viewSpec.filter ?? TOMT_FILTER}
          traffar={frame.view.length}
          totalt={frame.rowCount}
          onOppna={() => oppnaTabellverktyg('filter')}
          onVaxla={(id) =>
            sattFilter(tab, {
              ...(tab.viewSpec.filter ?? TOMT_FILTER),
              regler: (tab.viewSpec.filter?.regler ?? []).map((r) =>
                r.id === id ? { ...r, av: r.av !== true } : r,
              ),
            })
          }
          onTaBort={(id) =>
            sattFilter(tab, {
              ...(tab.viewSpec.filter ?? TOMT_FILTER),
              regler: (tab.viewSpec.filter?.regler ?? []).filter((r) => r.id !== id),
            })
          }
          onRensa={() => sattFilter(tab, TOMT_FILTER)}
        />
      )}

      {laddar && (
        <div class="forlopp" role="progressbar" aria-label={tf('Läser {0}', laddar)}>
          <div class="forlopp__stapel" />
        </div>
      )}

      <Innehall
        s={s}
        h={h}
        redigeringsfalt={redigeringsfalt}
        verktygKolumner={verktygKolumner}
        aktivKolumn={aktivKolumn}
      />

      {!egenVy && (
        <Statusrad
          tab={tab}
          begransad={begransad}
          sorterat={tab && frame ? beskrivSortering(frame, tab.viewSpec.sortering ?? []) : ''}
          sorteringInaktuell={sorteringenArInaktuell(tab)}
          verkstad={tab ? verkstadForFlik(tab.id) : null}
          onFortsattVerkstad={aterta}
          onUppdateraRegler={() => uppdateraMallkolumner()}
          onBorjaOm={() => setBorjaOmOppen(true)}
          onSorteraOm={() => tab && sorteraOm(tab)}
          onRensaSortering={() => tab && rensaSortering(tab)}
          onOppnaSortering={() => {
            stangEgnaVyer()
            oppnaTabellverktyg('sortera')
          }}
          onRensaVy={() => {
            if (!tab) return
            setSokOppen(false)
            clearViewSpec(tab)
          }}
          onRadmeny={(x, y) => setMeny({ x, y, poster: radmenyposter() })}
        />
      )}

      <Dialoger s={s} h={h} begransad={begransad} />

      {meny && (
        <Meny x={meny.x} y={meny.y} poster={meny.poster} onStang={() => setMeny(null)} />
      )}

      <input
        ref={palettFil}
        type="file"
        accept=".csv,.txt,.tsv,.xlsx,text/csv,text/plain"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          const filer = Array.from((e.currentTarget as HTMLInputElement).files ?? [])
          if (filer.length > 0) oppnaFiler(filer)
          ;(e.currentTarget as HTMLInputElement).value = ''
        }}
      />

      {slappOver && (
        <div class="slappoverlagg">{t('Släpp för att öppna som ny flik')}</div>
      )}
      <Toastar />
    </div>
  )
}
