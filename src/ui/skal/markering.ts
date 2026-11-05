import { useMemo } from 'preact/hooks'
import { parseDelimitedText } from '../../core/csv/parse.js'
import { toDelimited } from '../../core/csv/stringify.js'
import { unikFilnamn } from '../../core/frame/frame.js'
import { notify, setSelection, tabs, touch, undo } from '../../state/store.js'
import {
  fyllNedat,
  klistraIn,
  planeraInklistring,
  redigeraCell,
  sattMarkering,
  selectableColumns,
  selectedRows,
} from '../../state/edits.js'
import { antalCeller, cell, klamp, rect, type Selection } from '../../state/selection.js'
import type { Flytt } from '../grid/VirtualGrid.jsx'
import { celler, t, tf } from '../sprak.js'
import type { useFiler } from './filer.js'
import { nuLage, type SkalLage } from './lage.js'

/* ---------- Markering och redigering ---------- */

/** Markeringen, cellredigeringen, urklippet och fyllningen. */
export function useMarkering({
  tab,
  rev,
  behall,
  egnaBehallna,
  setInklistring,
  oppnaText,
}: Pick<SkalLage, 'tab' | 'rev' | 'behall' | 'egnaBehallna' | 'setInklistring'> &
  Pick<ReturnType<typeof useFiler>, 'oppnaText'>) {
  const markering = tab?.markering ?? null
  const synligaKolumner = tab ? selectableColumns(tab) : []

  /** Grupperingen rutnätet ritar, eller null när dubblettvyn är av. */
  const dubblettgrupper = tab?.viewSpec.dubbletter ? (tab.ordning?.grupper ?? null) : null

  /**
   * Raderna som stannar, en per grupp.
   *
   * Förvalet är den första raden i filen, alltså precis vad *Behåll den
   * första* gör. Att rita förvalet i stället för tomma ringar gör att man ser
   * vad som händer om man inte rör någonting.
   */
  const behallnaRader = useMemo(() => {
    if (!dubblettgrupper || behall !== 'valda') return null
    const forsta = new Map<number, number>()
    for (let r = 0; r < dubblettgrupper.grupp.length; r++) {
      const g = dubblettgrupper.grupp[r]!
      if (g !== 0 && !forsta.has(g)) forsta.set(g, r)
    }
    const ut = new Set<number>()
    for (const [g, r] of forsta) ut.add(egnaBehallna.get(g) ?? r)
    return ut
  }, [dubblettgrupper, egnaBehallna, behall, rev])

  const flyttaMarkering = (dRad: number, dKol: number, utoka: boolean, tillKant: boolean) => {
    const nu = nuLage()
    if (!nu) return
    const { tab, frame, kolumner: synligaKolumner } = nu
    if (frame.view.length === 0 || synligaKolumner.length === 0) return
    const nuvarande = nu.sel ?? cell(0, 0)
    const sistaRad = frame.view.length - 1
    const sistaKol = synligaKolumner.length - 1
    const rad = tillKant
      ? dRad > 0
        ? sistaRad
        : dRad < 0
          ? 0
          : nuvarande.fokusRad
      : nuvarande.fokusRad + dRad
    const kol = tillKant
      ? dKol > 0
        ? sistaKol
        : dKol < 0
          ? 0
          : nuvarande.fokusKol
      : nuvarande.fokusKol + dKol
    const ny: Selection = utoka
      ? { ...nuvarande, fokusRad: rad, fokusKol: kol }
      : { ankareRad: rad, ankareKol: kol, fokusRad: rad, fokusKol: kol }
    setSelection(tab, klamp(ny, frame.view.length, synligaKolumner.length))
  }

  const startaRedigering = (rad?: number, kol?: number) => {
    const nu = nuLage()
    if (!nu || !nu.sel) return
    nu.tab.redigerar = { rad: rad ?? nu.sel.fokusRad, kol: kol ?? nu.sel.fokusKol }
    touch()
  }

  const avslutaRedigering = (rad: number, kol: number, value: string, flytt: Flytt) => {
    if (!tab) return
    tab.redigerar = null
    redigeraCell(tab, rad, kol, value)
    if (flytt === 'ned') flyttaMarkering(1, 0, false, false)
    else if (flytt === 'hoger') flyttaMarkering(0, 1, false, false)
    else touch()
  }

  const kopieraMarkering = async () => {
    const nu = nuLage()
    if (!nu || !nu.sel) return
    const r = rect(nu.sel)
    const kolumner = nu.kolumner.slice(r.k1, r.k2 + 1)
    const rader = selectedRows(nu.tab, nu.sel)
    try {
      await navigator.clipboard.writeText(toDelimited(kolumner, rader, '\t'))
      notify(
        tf('{0} kopierade. Klistra in direkt i Excel.', celler(rader.length * kolumner.length)),
      )
    } catch {
      notify(t('Webbläsaren tillät inte kopiering till urklipp.'), { ton: 'varning' })
    }
  }

  const klippUtMarkering = async () => {
    await kopieraMarkering()
    const nu = nuLage()
    if (!nu || !nu.sel) return
    const andrade = sattMarkering(nu.tab, nu.sel, '')
    if (andrade > 0) {
      notify(tf('Klippte ut {0}.', celler(andrade)), {
        atgard: { etikett: t('Ångra'), kor: () => undo(nu.tab) },
      })
    }
  }

  /**
   * Klistrar in från menyn.
   *
   * Ctrl+V går genom webbläsarens paste-händelse och kräver ingen
   * behörighet. En menypost måste läsa urklippet själv, vilket
   * webbläsaren får neka — och då sägs det rakt ut i stället för att
   * ingenting händer.
   */
  const klistraInFranMeny = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text.trim() !== '') forbereKlistraIn(text)
    } catch {
      notify(t('Webbläsaren tillät inte att urklippet lästes. Tryck Ctrl+V i stället.'), {
        ton: 'varning',
      })
    }
  }

  const fyllNedatMarkering = () => {
    const n = nuLage()
    if (!n?.sel) return
    const andrade = fyllNedat(n.tab, n.sel)
    if (andrade > 0) {
      notify(tf('Fyllde nedåt i {0}.', celler(andrade)), {
        atgard: { etikett: t('Ångra'), kor: () => undo(n.tab) },
      })
    }
  }

  const tomMarkering = () => {
    const nu = nuLage()
    if (!nu || !nu.sel) return
    const andrade = sattMarkering(nu.tab, nu.sel, '')
    if (andrade > 0) {
      notify(tf('Tömde {0}.', celler(andrade)), {
        atgard: { etikett: t('Ångra'), kor: () => undo(nu.tab) },
      })
    }
  }

  /**
   * Fyller hela markeringen med ett värde.
   *
   * `sattMarkering` fanns redan men nåddes bara av Delete, alltså med tomma
   * strängen. Att skriva samma ortsnamn i fyrtio celler för hand är precis
   * det slit verktyget finns för.
   */
  const fyllMarkering = () => {
    const nu = nuLage()
    if (!nu || !nu.sel) return
    const antal = antalCeller(nu.sel)
    const svar = window.prompt(`Fyll ${celler(antal)} med värdet`, '')
    if (svar === null) return
    const andrade = sattMarkering(nu.tab, nu.sel, svar)
    if (andrade === 0) {
      notify(t('Cellerna hade redan det värdet.'))
      return
    }
    notify(tf('Fyllde {0}.', celler(andrade)), {
      atgard: { etikett: t('Ångra'), kor: () => undo(nu.tab) },
    })
  }

  /** Öppnar urklippstexten som en egen flik, som i det tomma läget. */
  const klistraInSomNyFil = (text: string) => {
    if (text.trim() === '') return
    // Inklistringarna numreras: två flikar som båda heter `inklistrat.csv`
    // går inte att skilja åt, och det är just två man har när man jämför.
    oppnaText(
      text,
      unikFilnamn(
        tabs.value.map((t) => t.frame.name),
        'Inklistrat 1',
      ),
    )
  }

  /**
   * Läser urklippet själv och öppnar det som en ny fil.
   *
   * För paletten och menyerna, som inte kommer via webbläsarens
   * paste-händelse. Nekas läsningen sägs det rakt ut — samma väg som
   * `klistraInFranMeny`.
   */
  const klistraInSomNyFilFranMeny = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text.trim() === '') {
        notify(t('Urklippet är tomt.'))
        return
      }
      klistraInSomNyFil(text)
    } catch {
      notify(t('Webbläsaren tillät inte att urklippet lästes. Tryck Ctrl+Skift+V i stället.'), {
        ton: 'varning',
      })
    }
  }

  const forbereKlistraIn = (text: string) => {
    const nu = nuLage()
    if (!nu || !nu.sel) return
    const { tab, sel } = nu
    const { rows } = parseDelimitedText(text)
    if (rows.length === 0) return
    const plan = planeraInklistring(tab, sel, rows)
    /*
     * En inklistring som ser ut som en hel tabell kan lika gärna ha varit
     * tänkt som en ny fil.
     *
     * I det tomma läget blir en inklistring alltid en ny fil, och det är
     * uppenbart. Med en fil öppen hamnar den i tabellen — vilket är rätt för
     * en cell eller en kolumn ur Excel, men fel för den som just kopierat ett
     * helt nytt underlag. Att fråga varje gång skulle kosta ett Enter i det
     * arbetsflöde verktyget är byggt för, så svaret ligger i notisen i
     * stället: den vanliga vägen är oförändrad, och alternativet är ett klick
     * bort just när det är aktuellt.
     */
    /*
     * Två olika mått, med flit.
     *
     * Här räcker "flera rader och flera kolumner", eftersom notisens knapp
     * inte står i vägen för någon: den syns en stund och försvinner. Dialogen
     * använder den strängare regeln — att första raden ser ut som en
     * rubrikrad — för att avgöra vilken knapp som är *förvald*, och det är
     * ett starkare påstående som förtjänar ett starkare tecken.
     */
    const bredd = Math.max(...rows.map((r) => r.length), 0)
    const serUtSomFil = rows.length >= 2 && bredd >= 2
    const somNyFil = {
      etikett: t('Öppna som ny fil i stället'),
      kor: () => {
        undo(tab)
        klistraInSomNyFil(text)
      },
    }

    if (plan.extraRader === 0 && plan.extraKolumner === 0) {
      const andrade = klistraIn(tab, sel, plan, false)
      const angra = { etikett: t('Ångra'), kor: () => undo(tab) }
      notify(tf('Klistrade in {0}.', celler(andrade)), {
        atgard: serUtSomFil ? [angra, somNyFil] : angra,
      })
      return
    }
    setInklistring({ plan, sel, text })
  }

  return {
    markering,
    synligaKolumner,
    dubblettgrupper,
    behallnaRader,
    flyttaMarkering,
    startaRedigering,
    avslutaRedigering,
    kopieraMarkering,
    klippUtMarkering,
    klistraInFranMeny,
    fyllNedatMarkering,
    tomMarkering,
    fyllMarkering,
    klistraInSomNyFil,
    klistraInSomNyFilFranMeny,
    forbereKlistraIn,
  }
}
