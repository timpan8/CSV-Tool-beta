import type { Column, ColumnId } from '../../core/types.js'
import { getCell } from '../../core/frame/column.js'
import { columnIndex, findColumn } from '../../core/frame/frame.js'
import { innehallsprofil } from '../../core/frame/innehall.js'
import { fargaCeller, sattKolumnfarg } from '../../state/farg.js'
import { notify, sattSortering, undo, vaxlaSortering } from '../../state/store.js'
import { dupliceraRader, infogaRader, selectedRows } from '../../state/edits.js'
import { antalCeller, rect } from '../../state/selection.js'
import { tillMenypost } from '../kommandon.js'
import type { MenyPost } from '../parts.jsx'
import { celler, kolumner as kolumnerText, t, tf } from '../sprak.js'
import { ordnaVerktyg, type Verktygsnamn } from '../verktyg.jsx'
import type { useKolumnatgarder } from './kolumnatgarder.js'
import { nuLage, type SkalLage } from './lage.js'
import type { useMallkolumner } from './mallkolumner.js'
import type { useMarkering } from './markering.js'
import { fargmeny, kolumnMeny, radMeny } from './menyer.js'
import type { useRader } from './rader.js'
import type { useStadverktyg } from './stadverktyg.js'
import type { useVy } from './vy.js'

/**
 * Verktyg som kör över hela markeringen.
 *
 * De skriver om kolumnerna på plats. De övriga *skapar* kolumner, och tolv
 * nya kolumner ur en markering är sällan vad någon menade — de arbetar på
 * den kolumn man klickade i.
 */
const FLERKOLUMNSVERKTYG = new Set<Verktygsnamn>(['datum', 'tal', 'telefon', 'ersatt'])

/** Kortar ett värde så att en menypost inte blir bredare än skärmen. */
function kort(value: string): string {
  return value.length > 28 ? `${value.slice(0, 27)}…` : value
}

/* ---------- Menyer ---------- */

/** Menyerna som läser rutnätets läge: kolumn-, cell-, rad- och tomrumsmenyn. */
export function useMenyposter({
  tab,
  frame,
  lagen,
  setSammanfatta,
  dopOmKolumn,
  dupliceraKolumn,
  vaxlaDold,
  infogaKolumn,
  flyttaKolumn,
  anpassaKolumnbredd,
  taBortKolumn,
  visaOgiltiga,
  fyllMarkering,
  taBortMarkeradeRader,
  laggTillNummerkolumn,
  oppnaVerktyg,
  oppnaTabellverktyg,
  filtreraKolumn,
  regelposter,
}: Pick<SkalLage, 'tab' | 'frame' | 'lagen' | 'setSammanfatta'> &
  Pick<
    ReturnType<typeof useKolumnatgarder>,
    | 'dopOmKolumn'
    | 'dupliceraKolumn'
    | 'vaxlaDold'
    | 'infogaKolumn'
    | 'flyttaKolumn'
    | 'anpassaKolumnbredd'
    | 'taBortKolumn'
  > &
  Pick<ReturnType<typeof useVy>, 'visaOgiltiga'> &
  Pick<ReturnType<typeof useMarkering>, 'fyllMarkering'> &
  Pick<ReturnType<typeof useRader>, 'taBortMarkeradeRader' | 'laggTillNummerkolumn'> &
  Pick<ReturnType<typeof useStadverktyg>, 'oppnaVerktyg' | 'oppnaTabellverktyg' | 'filtreraKolumn'> &
  Pick<ReturnType<typeof useMallkolumner>, 'regelposter'>) {
  /**
   * Verktygen som menyposter, det passande först.
   *
   * Vilka som passar avgörs av innehållet — se `innehallsprofil` — och räknas
   * på den kolumn man klickade i. De övriga göms inte, de hamnar under *Fler
   * verktyg*.
   *
   * `kolumner` är hela markeringen med den klickade först. Datum, tal,
   * telefon och sök & ersätt kör på allihop; de verktyg som skapar nya
   * kolumner tar den första.
   */
  const verktygsposter = (kolumner: Column[], klickad?: Column): (MenyPost | 'avdelare')[] => {
    const col = klickad ?? kolumner[0]!
    const ider = kolumner.map((c) => c.id)
    const flera = kolumner.length > 1
    const ordning = ordnaVerktyg(innehallsprofil(col))
    const post = (namn: Verktygsnamn, etikett: string, skal?: string): MenyPost => {
      // Bara de omskrivande verktygen tar hela markeringen. De som skapar
      // kolumner arbetar på den man klickade i — tolv nya kolumner ur en
      // markering är sällan vad någon menade.
      const manga = flera && FLERKOLUMNSVERKTYG.has(namn)
      return {
        etikett: manga
          ? tf('{0} i {1}…', etikett.replace(/…$/, ''), kolumnerText(kolumner.length))
          : etikett,
        skal,
        kor: () => oppnaVerktyg(namn, manga ? ider : [col.id]),
      }
    }
    return [
      ...ordning.passande.map((p) => post(p.post.namn, t(p.post.etikett), p.skal)),
      {
        etikett: t('Fler verktyg'),
        undermeny: ordning.ovriga.map((v) => post(v.namn, t(v.etikett))),
      },
    ]
  }

  /**
   * Färgar markeringen — eller hela raderna, när `helaRaden` är satt.
   *
   * Cellmenyn färgar de celler man markerat; radmenyn färgar raderna tvärs
   * över alla synliga kolumner. Samma steg, samma Ångra i notisen.
   */
  const fargaMarkeringen = (farg: number, helaRaden = false) => {
    const nu = nuLage()
    if (!nu?.sel) return
    const r = rect(nu.sel)
    const kolumner = helaRaden ? nu.kolumner : nu.kolumner.slice(r.k1, r.k2 + 1)
    const andrade = fargaCeller(nu.tab, kolumner, selectedRows(nu.tab, nu.sel), farg)
    if (andrade === 0) {
      notify(t(farg === 0 ? 'Cellerna hade ingen färg.' : 'Cellerna hade redan den färgen.'))
      return
    }
    notify(
      farg === 0
        ? tf('Tog bort färgen från {0}.', celler(andrade))
        : tf('Färgade {0}.', celler(andrade)),
      { atgard: { etikett: t('Ångra'), kor: () => undo(nu.tab) } },
    )
  }

  /** Färgar varje cell i kolumnen. */
  const fargaKolumn = (id: ColumnId, farg: number) => {
    if (!frame || !tab) return
    const col = findColumn(frame, id)
    if (!col) return
    const alla = Array.from({ length: frame.rowCount }, (_, i) => i)
    const andrade = fargaCeller(tab, [col], alla, farg)
    if (andrade === 0) return
    notify(
      farg === 0
        ? tf('Tog bort färgen från {0}.', celler(andrade))
        : tf('Färgade {0}.', celler(andrade)),
      { atgard: { etikett: t('Ångra'), kor: () => undo(tab) } },
    )
  }

  const radmenyposter = (): (MenyPost | 'avdelare')[] =>
    radMeny({
      farga: (farg) => fargaMarkeringen(farg, true),
      infogaFore: () => {
        const nu = nuLage()
        if (nu?.sel) infogaRader(nu.tab, nu.sel.fokusRad, 1, false)
      },
      infogaEfter: () => {
        const nu = nuLage()
        if (nu?.sel) infogaRader(nu.tab, nu.sel.fokusRad, 1, true)
      },
      duplicera: () => {
        const nu = nuLage()
        if (nu?.sel) dupliceraRader(nu.tab, selectedRows(nu.tab, nu.sel))
      },
      taBort: taBortMarkeradeRader,
    })

  const kolumnmenyposter = (id: ColumnId): (MenyPost | 'avdelare')[] => {
    if (!frame || !tab) return []
    const col = findColumn(frame, id)
    if (!col) return []
    return kolumnMeny(id, {
      dopOm: dopOmKolumn,
      duplicera: dupliceraKolumn,
      vaxlaDold,
      infogaFore: (i) => infogaKolumn(columnIndex(frame, i)),
      infogaEfter: (i) => infogaKolumn(columnIndex(frame, i) + 1),
      lopnummer: laggTillNummerkolumn,
      flyttaForst: (i) => flyttaKolumn(i, 0),
      flyttaSist: (i) => flyttaKolumn(i, frame.columns.length - 1),
      anpassaBredd: (i) => anpassaKolumnbredd(i),
      kolumnfarg: (i, farg) => {
        const c = findColumn(frame, i)
        if (c) sattKolumnfarg(tab, c, farg)
      },
      fargaAlla: fargaKolumn,
      farg: col.farg ?? 0,
      visaOgiltiga,
      verktyg: verktygsposter([col]),
      regel: regelposter(col),
      filtrera: (i) => filtreraKolumn(i),
      namn: col.name,
      sammanfatta: (i) => setSammanfatta({ startkolumn: i }),
      sortera: (i, riktning) => sattSortering(tab, [{ colId: i, riktning }]),
      laggSortering: (i) => vaxlaSortering(tab, i, true),
      sorteraFlera: (i) => {
        // Från kolumnens meny: kolumnen blir första nivån om ingen finns.
        // Panelen ska öppnas med något att ställa in, inte tom.
        if (!tab.viewSpec.sortering?.length) sattSortering(tab, [{ colId: i, riktning: 'stigande' }])
        oppnaTabellverktyg('sortera')
      },
      sortriktning: tab.viewSpec.sortering?.find((n) => n.colId === id)?.riktning ?? null,
      taBort: taBortKolumn,
      dold: col.hidden,
    })
  }

  /**
   * Cellmenyn.
   *
   * Kortare än kolumnmenyn med flit. Kolumnens sällanåtgärder — flytta
   * först, infoga tom kolumn, byt namn — hör hemma på rubriken. Det är hela
   * skillnaden mellan en meny som hjälper och en som måste läsas.
   */
  /** En menypost ur registret. Ett id som saknas i läget ger en avstängd post, aldrig ett hål. */
  const kommando = (id: string, extra: Partial<MenyPost> = {}): MenyPost => {
    const k = lagen.current.kommandon.find((k) => k.id === id)
    return k ? tillMenypost(k, extra) : { etikett: id, inaktiv: t('Inte tillgängligt just nu.') }
  }

  const cellmenyposter = (rad: number, kol: number): (MenyPost | 'avdelare')[] => {
    const nu = nuLage()
    if (!nu) return []
    const col = nu.kolumner[kol]
    const fysisk = nu.frame.view[rad]
    if (!col || fysisk === undefined) return []
    const varde = getCell(col, fysisk)
    const flera = nu.sel !== null && antalCeller(nu.sel) > 1
    /*
     * De omskrivande verktygen körs på hela markeringens kolumner, i
     * rutnätets ordning. De kolumnskapande arbetar på den man klickade i.
     */
    const r = nu.sel ? rect(nu.sel) : null
    const verktygskolumner = r ? nu.kolumner.slice(r.k1, r.k2 + 1) : [col]

    return [
      // Urklippsposterna kommer ur registret, så genvägen som står här är
      // alltid den som tangentbordet faktiskt lyssnar på.
      kommando('klipput'),
      kommando('kopiera'),
      kommando('klistrain'),
      kommando('klistrasomfil', { skal: t('lämnar den här tabellen orörd') }),
      'avdelare',
      {
        etikett: flera ? 'Fyll markeringen med ett värde…' : 'Skriv ett värde…',
        kor: fyllMarkering,
      },
      kommando('fyllnedat'),
      kommando('tom'),
      { etikett: t('Färg'), undermeny: fargmeny((f) => fargaMarkeringen(f)) },
      'avdelare',
      {
        etikett: tf('Filtrera på ”{0}”', kort(varde)),
        inaktiv: varde === '' ? t('Cellen är tom. Filtrera på kolumnen i stället.') : undefined,
        kor: () => filtreraKolumn(col.id, { operator: 'iLista', varden: [varde] }),
      },
      { etikett: tf('Sortera på {0}', col.name), kor: () => vaxlaSortering(nu.tab, col.id, false) },
      {
        etikett: tf('Gruppera på {0}…', col.name),
        skal: t('en rad per värde, med summa och antal för resten av kolumnerna'),
        kor: () => setSammanfatta({ startkolumn: col.id }),
      },
      'avdelare',
      ...verktygsposter(verktygskolumner, col),
      'avdelare',
      { etikett: t('Radens åtgärder'), undermeny: radmenyposter() },
    ]
  }

  /*
   * Högerklick i tomrummet: innanför rutnätet men utanför kolumnerna. Det
   * användaren bad om var kolumnen; raden är samma gest riktad mot tomrummet
   * under tabellen. `infogaRader` med ett vyindex bortom sista raden lägger
   * raden sist i filen, oavsett sortering och filter.
   */
  const tomrumsmeny = (): (MenyPost | 'avdelare')[] => [
    { etikett: t('Infoga en ny kolumn'), kor: () => infogaKolumn() },
    {
      etikett: t('Lägg till en rad sist'),
      kor: () => {
        if (tab && frame) infogaRader(tab, frame.view.length, 1, true)
      },
    },
  ]

  return {
    verktygsposter,
    fargaMarkeringen,
    fargaKolumn,
    radmenyposter,
    kolumnmenyposter,
    kommando,
    cellmenyposter,
    tomrumsmeny,
  }
}
