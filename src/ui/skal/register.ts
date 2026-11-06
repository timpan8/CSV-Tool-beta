import type { Column } from '../../core/types.js'
import {
  canRedo,
  canUndo,
  clearViewSpec,
  glomSparat,
  notify,
  redo,
  setSelection,
  theme,
  undo,
  verktygsfalt,
} from '../../state/store.js'
import { dupliceraRader, infogaRader, selectedRows } from '../../state/edits.js'
import { sattKolumnfarg } from '../../state/farg.js'
import { oppnaJamfor } from '../../state/jamfor.js'
import { oppnaKombinera } from '../../state/kombinera.js'
import { sessionslage } from '../../state/matchning.js'
import { oppnaPivot } from '../../state/pivot.js'
import { oppnaSlaIhop } from '../../state/slaihop.js'
import { oppnaVy } from '../../state/vylage.js'
import { byggKommandon, type Kommando } from '../kommandon.js'
import { sattSprak, sprak, tf } from '../sprak.js'
import type { Handlingar } from './handlingar.js'
import type { SkalLage } from './lage.js'

/** Kommandoregistret, byggt ur det läge som gäller just nu. Se `byggKommandon`. */
export function byggRegister({
  tab,
  frame,
  palettFil,
  setBorjaOmOppen,
  setInstallningarOppna,
  setExportOppen,
  setProfilerOppna,
  setSokOppen,
  setSammanfatta,
  setDopOmFlikId,
  markering,
  synligaKolumner,
  aterta,
  klippUtMarkering,
  kopieraMarkering,
  klistraInFranMeny,
  fyllNedatMarkering,
  tomMarkering,
  stangEgnaVyer,
  oppnaTabellverktyg,
  stada,
  oppnaVerktyg,
  dopOmKolumn,
  dupliceraKolumn,
  vaxlaDold,
  fargaMarkeringen,
  taBortKolumn,
  infogaKolumn,
  laggTillNummerkolumn,
  klistraInSomNyFilFranMeny,
  filtreraKolumn,
  visaOgiltiga,
  taBortMarkeradeRader,
  stadaTommaRader,
  stadaTommaKolumner,
  palettKolumn,
  begransad,
}: Pick<
  SkalLage,
  | 'tab'
  | 'frame'
  | 'palettFil'
  | 'setBorjaOmOppen'
  | 'setInstallningarOppna'
  | 'setExportOppen'
  | 'setProfilerOppna'
  | 'setSokOppen'
  | 'setSammanfatta'
  | 'setDopOmFlikId'
> &
  Pick<
    Handlingar,
    | 'markering'
    | 'synligaKolumner'
    | 'aterta'
    | 'klippUtMarkering'
    | 'kopieraMarkering'
    | 'klistraInFranMeny'
    | 'fyllNedatMarkering'
    | 'tomMarkering'
    | 'stangEgnaVyer'
    | 'oppnaTabellverktyg'
    | 'stada'
    | 'oppnaVerktyg'
    | 'dopOmKolumn'
    | 'dupliceraKolumn'
    | 'vaxlaDold'
    | 'fargaMarkeringen'
    | 'taBortKolumn'
    | 'infogaKolumn'
    | 'laggTillNummerkolumn'
    | 'klistraInSomNyFilFranMeny'
    | 'filtreraKolumn'
    | 'visaOgiltiga'
    | 'taBortMarkeradeRader'
    | 'stadaTommaRader'
    | 'stadaTommaKolumner'
  > & {
    /** Kolumnen palettens kommandon gäller — se `Skal`. */
    palettKolumn: Column | null
    begransad: boolean
  }): Kommando[] {
  return byggKommandon(
    {
      harFil: frame !== null,
      filnamn: frame?.name ?? null,
      kolumn: palettKolumn?.name ?? null,
      kolumnDold: palettKolumn?.hidden ?? false,
      harMarkering: markering !== null,
      kanAngra: canUndo(tab),
      kanGoraOm: canRedo(tab),
      begransadVy: begransad,
      parkerad: (() => {
        const l = sessionslage()
        return l.lage === 'redo' ? l.namn : null
      })(),
    },
    {
      fortsattVerkstad: aterta,
      klippUt: () => void klippUtMarkering(),
      kopiera: () => void kopieraMarkering(),
      klistraIn: () => void klistraInFranMeny(),
      fyllNedat: fyllNedatMarkering,
      tomMarkering,
      markeraAllt: () => {
        if (!tab || !frame) return
        if (frame.view.length > 0 && synligaKolumner.length > 0) {
          setSelection(tab, {
            ankareRad: 0,
            ankareKol: 0,
            fokusRad: frame.view.length - 1,
            fokusKol: synligaKolumner.length - 1,
          })
        }
      },
      oppnaFil: () => palettFil.current?.click(),
      borjaOm: () => setBorjaOmOppen(true),
      glomSparat: () => {
        void glomSparat().then(() =>
          notify(
            'Det sparade är borta. Flikarna du har öppna står kvar, och det du gör härnäst sparas som vanligt.',
          ),
        )
      },
      exportera: () => setExportOppen(true),
      profiler: () => setProfilerOppna(true),
      // Sökraden och tabellverktygen ritas bara i rutnätsläget, så en
      // egen vy måste stängas först — annars sätts ett läge som inte
      // syns förrän vyn råkar stängas. Se `stangEgnaVyer`.
      sok: () => {
        stangEgnaVyer()
        setSokOppen(true)
      },
      sortera: () => {
        stangEgnaVyer()
        oppnaTabellverktyg('sortera')
      },
      filter: () => {
        stangEgnaVyer()
        oppnaTabellverktyg('filter')
      },
      dubbletter: () => {
        stangEgnaVyer()
        oppnaTabellverktyg('dubbletter')
      },
      slaIhop: () => oppnaSlaIhop(),
      jamfor: () => oppnaJamfor(),
      kombinera: () => oppnaKombinera(),
      mall: () => oppnaKombinera(true),
      sammanfatta: () => setSammanfatta({ startkolumn: palettKolumn?.id ?? null }),
      pivot: () => oppnaPivot(),
      oversikt: () => oppnaVy({ typ: 'oversikt' }),
      visaAllaRader: () => {
        if (!tab) return
        setSokOppen(false)
        clearViewSpec(tab)
      },
      stada,
      verktyg: (namn) => palettKolumn && oppnaVerktyg(namn, palettKolumn.id),
      dopOm: () => palettKolumn && dopOmKolumn(palettKolumn.id),
      dopOmFil: () => tab && setDopOmFlikId(tab.id),
      duplicera: () => palettKolumn && dupliceraKolumn(palettKolumn.id),
      vaxlaDold: () => palettKolumn && vaxlaDold(palettKolumn.id),
      fargaMarkering: (farg) => fargaMarkeringen(farg),
      kolumnfarg: (farg) => {
        if (tab && palettKolumn) sattKolumnfarg(tab, palettKolumn, farg)
      },
      taBortKolumn: () => palettKolumn && taBortKolumn(palettKolumn.id),
      infogaKolumn: () => infogaKolumn(),
      lopnummer: laggTillNummerkolumn,
      klistraSomFil: () => void klistraInSomNyFilFranMeny(),
      filtreraKolumn: () => palettKolumn && filtreraKolumn(palettKolumn.id),
      visaOgiltiga: () => palettKolumn && visaOgiltiga(palettKolumn.id),
      infogaRadOvan: () =>
        tab && markering && infogaRader(tab, markering.fokusRad, 1, false),
      infogaRadUnder: () =>
        tab && markering && infogaRader(tab, markering.fokusRad, 1, true),
      dupliceraRader: () =>
        tab && markering && dupliceraRader(tab, selectedRows(tab, markering)),
      taBortRader: taBortMarkeradeRader,
      tommaRader: stadaTommaRader,
      tommaKolumner: stadaTommaKolumner,
      angra: () => {
        if (!tab) return
        const step = undo(tab)
        if (step) notify(tf('Ångrade: {0}', step.label))
      },
      goraOm: () => {
        if (!tab) return
        const step = redo(tab)
        if (step) notify(tf('Gjorde om: {0}', step.label))
      },
      vaxlaTema: () => {
        theme.value = theme.value === 'dark' ? 'light' : 'dark'
      },
      vaxlaSprak: () => sattSprak(sprak.value === 'en' ? 'sv' : 'en'),
      installningar: () => setInstallningarOppna(true),
      vaxlaVerktygsfalt: () => {
        verktygsfalt.value = verktygsfalt.value === 'rad' ? 'lodrat' : 'rad'
      },
    },
  )
}
