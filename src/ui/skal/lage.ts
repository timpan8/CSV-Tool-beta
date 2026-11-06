import { useRef, useState } from 'preact/hooks'
import type { Column, ColumnId, Frame } from '../../core/types.js'
import type { Behall } from '../../core/ops/duplicates.js'
import { activeTab, revision, type Tab } from '../../state/store.js'
import { selectableColumns, type PasteRequest } from '../../state/edits.js'
import type { Selection } from '../../state/selection.js'
import { vylage } from '../../state/vylage.js'
import type { Kommando } from '../kommandon.js'
import type { MenyPost } from '../parts.jsx'
import type { Verktygsnamn } from '../verktyg.jsx'

/**
 * Skalets tillstånd: det som förr låg som en rad `useState` överst i `App`.
 *
 * `useSkalLage` äger varje lokalt läge och ref:en `lagen`; sektionerna i
 * `handlingar.ts` får det de behöver som ett `Pick` härifrån.
 */

export interface MenyLage {
  x: number
  y: number
  poster: (MenyPost | 'avdelare')[]
}

export interface PasteState {
  plan: PasteRequest
  sel: Selection
  /** Råtexten, så att dialogen kan erbjuda att öppna den som en egen fil. */
  text: string
}

/**
 * Lägen som tangentbordshanteraren måste se *direkt*.
 *
 * Hanteraren registreras i en effekt, och effekter körs efter ritningen.
 * Paletten kan alltså stå på skärmen medan hanteraren fortfarande bär det
 * gamla värdet — och då gick Escape till rutnätet, som inte gör någonting
 * med den, i stället för till paletten. Lokalt hann effekten alltid före;
 * i CI, med två arbetare på en långsammare maskin, gjorde den det inte.
 *
 * Ref:en skrivs under renderingen och är därför sann i samma ögonblick som
 * paletten syns. Samma resonemang gäller översikten och sökraden: de har
 * inte visat felet, men de bygger på samma antagande.
 */
export interface Lagen {
  palett: boolean
  meny: boolean
  oversikt: boolean
  sok: boolean
  /** Stänger den vy som faktiskt ritas överst, eller null när ingen gör det. */
  stangEgenVy: (() => void) | null
  /** Registret, byggt vid varje ritning: tangentbordet och menyerna läser det härifrån. */
  kommandon: Kommando[]
}

/**
 * Läser flik och markering ur tillståndet i stället för ur renderingens
 * closure.
 *
 * Tangentbords- och urklippshanterare registreras i en effekt, och den
 * effekten körs *efter* renderingen. Klickar man på en cell och klistrar in
 * innan effekten hunnit registreras om, ser hanteraren fortfarande den
 * gamla markeringen och skriver på fel plats. Det var precis vad som hände
 * i CI, där maskinen klickar och klistrar in inom samma bildruta.
 */
export function nuLage(): { tab: Tab; frame: Frame; kolumner: Column[]; sel: Selection | null } | null {
  const t = activeTab.value
  if (!t) return null
  return { tab: t, frame: t.frame, kolumner: selectableColumns(t), sel: t.markering }
}

export function useSkalLage() {
  const [kö, setKö] = useState<File[]>([])
  const [exportOppen, setExportOppen] = useState(false)
  const [profilerOppna, setProfilerOppna] = useState(false)
  const [palettOppen, setPalettOppen] = useState(false)
  // Vilken vy som ligger över rutnätet, om någon. Se `state/vylage.ts`.
  const vy = vylage.value.typ
  const oversiktOppen = vy === 'oversikt'
  /**
   * Grupperingsdialogen, med kolumnen man öppnade den från.
   *
   * `null` betyder stängd; `{ startkolumn: null }` betyder öppnad utan att
   * någon kolumn pekats ut, alltså från verktygsraden eller paletten.
   */
  const [sammanfatta, setSammanfatta] = useState<{ startkolumn: ColumnId | null } | null>(null)
  /**
   * Vilken rad i varje dubblettgrupp som stannar.
   *
   * Valet bor här och inte i dubblettpanelen, eftersom det är rutnätet som
   * ritar och tar emot det — panelen beskriver bara vad som räknas som lika.
   * `egnaBehallna` går på gruppnummer, som gäller så länge grupperingen är
   * densamma; en ny nyckel nollställer den.
   */
  const [behall, setBehall] = useState<Behall>('forsta')
  const [egnaBehallna, setEgnaBehallna] = useState<Map<number, number>>(new Map())
  const palettFil = useRef<HTMLInputElement>(null)
  const [meny, setMeny] = useState<MenyLage | null>(null)
  /** Fliken vars namn redigeras i flikraden, eller null. */
  const [dopOmFlikId, setDopOmFlikId] = useState<string | null>(null)
  const [laddar, setLaddar] = useState<string | null>(null)
  const [slappOver, setSlappOver] = useState(false)
  const [sokOppen, setSokOppen] = useState(false)
  const [inklistring, setInklistring] = useState<PasteState | null>(null)
  const [borjaOmOppen, setBorjaOmOppen] = useState(false)
  const [installningarOppna, setInstallningarOppna] = useState(false)
  /**
   * Vilket städverktyg som är öppet, och på vilka kolumner.
   *
   * Kolumnerna fångas när verktyget öppnas och inte löpande ur markeringen:
   * flyttar man markören medan panelen står öppen ska förhandsvisningen ligga
   * kvar på det man valde.
   */
  const [verktyg, setVerktyg] = useState<{ id: Verktygsnamn; colIds: ColumnId[] } | null>(null)
  /**
   * Tabellverktyg i högerpanelen — de som inte hör till en enskild kolumn.
   * Sortering, och i nästa steg filter och dubbletter.
   */
  const [tabellverktyg, setTabellverktyg] = useState<'sortera' | 'filter' | 'dubbletter' | null>(
    null,
  )

  const tab = activeTab.value
  const frame = tab?.frame ?? null
  const rev = revision.value

  const lagen = useRef<Lagen>({
    palett: false,
    meny: false,
    oversikt: false,
    sok: false,
    stangEgenVy: null,
    kommandon: [],
  })
  lagen.current.palett = palettOppen
  lagen.current.meny = meny !== null
  lagen.current.oversikt = oversiktOppen
  lagen.current.sok = sokOppen

  return {
    kö,
    setKö,
    exportOppen,
    setExportOppen,
    profilerOppna,
    setProfilerOppna,
    palettOppen,
    setPalettOppen,
    vy,
    oversiktOppen,
    sammanfatta,
    setSammanfatta,
    behall,
    setBehall,
    egnaBehallna,
    setEgnaBehallna,
    palettFil,
    meny,
    setMeny,
    dopOmFlikId,
    setDopOmFlikId,
    laddar,
    setLaddar,
    slappOver,
    setSlappOver,
    sokOppen,
    setSokOppen,
    inklistring,
    setInklistring,
    borjaOmOppen,
    setBorjaOmOppen,
    installningarOppna,
    setInstallningarOppna,
    verktyg,
    setVerktyg,
    tabellverktyg,
    setTabellverktyg,
    tab,
    frame,
    rev,
    lagen,
  }
}

export type SkalLage = ReturnType<typeof useSkalLage>
