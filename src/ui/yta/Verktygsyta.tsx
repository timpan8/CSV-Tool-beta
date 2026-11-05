import type { ComponentChildren } from 'preact'
import { useLayoutEffect, useRef } from 'preact/hooks'
import { t } from '../sprak.js'

/**
 * Ytan ett verktyg bor i.
 *
 * Förut fanns tre: sidopanelen (`Verktygspanel`), dialogen (`Modal`) och
 * helskärmsvyerna. Tre behållare betydde tre regler för Escape — panelen
 * struntade i tangenten i ett `INPUT` men inte i en rullgardin, dialogen
 * stängde alltid, också mitt i ett fält — ingen Enter alls, ingen som lämnade
 * tillbaka fokus, och fötter som sa *Avbryt/Tillämpa* på ett ställe,
 * *Stäng/Ta bort 3 rader* på ett annat och *Ta bort alla regler/Klar* på ett
 * tredje.
 *
 * Nu är det en behållare med två utseenden, och foten är en **beskrivning**
 * i stället för markering: en primär knapp (Enter), en sekundär (Escape), en
 * valfri destruktiv längst till vänster, och extra knappar däremellan när ett
 * verktyg har fler vägar ut. Att foten är data är det som låter reglerna bo
 * på ett ställe: det går inte att skriva en panel som glömmer Escape.
 *
 * **Enter** tillämpar när fokus ligger i ytan och inte i en textarea, en
 * rullgardin eller på en knapp (knappen har redan sin egen Enter). Lyssnaren
 * sitter på ytan, inte på fönstret, så Enter i rutnätet börjar fortfarande
 * redigera cellen och Enter i paletten kör palettens kommando.
 *
 * **Escape** stänger ytan var fokus än ligger — en panel bredvid tabellen ska
 * gå att stänga utan att först klicka i den — men bara den **översta** ytan:
 * en dialog öppnad ovanpå en panel tar tangenten själv. I ett textfält
 * betyder första Escape *lämna fältet*; nästa stänger.
 *
 * **Fokus** sparas när ytan öppnas och lämnas tillbaka när den stängs, så
 * att den som öppnade ett verktyg från rutnätet står kvar i rutnätet efteråt.
 * En dialog tar fokus till sitt första fält och håller tabb-cykeln inom sig;
 * en panel rör inte fokus alls, eftersom rutnätets markering styrs därifrån
 * och ett verktyg som stjäl pilarna vore ett steg bakåt.
 */
export type Yta = 'panel' | 'dialog'

export interface Fotknapp {
  etikett: string
  kor: () => void
  /** Falskt gör knappen avstängd; `titel` säger då varför. */
  kan?: boolean
  titel?: string
}

export interface Fot {
  /** Körs på Enter. Röd när `fara` är satt — borttagningen i Dubbletter är verktygets poäng. */
  primar?: Fotknapp & { fara?: boolean }
  /** Körs på Escape. Saknas den används `onStang` med etiketten Avbryt eller Stäng. */
  sekundar?: Fotknapp
  /** Längst till vänster, alltid röd, aldrig tangentbunden: *Ta bort sorteringen*. */
  destruktiv?: Fotknapp
  /** Övriga vägar ut, mellan den destruktiva och de två vanliga. */
  extra?: Fotknapp[]
}

/** Ytorna som är uppe, i öppningsordning. Den sista äger Escape. */
interface Oppen {
  id: symbol
  rot: HTMLElement | null
  stang: () => void
}
const oppna: Oppen[] = []

/*
 * En enda lyssnare för alla ytor, registrerad när den första öppnas.
 *
 * Lyssnaren hör ihop med stapeln och inte med komponenten: en lyssnare i
 * en `useEffect` finns först efter målningen, och ett Escape som kommer
 * mellan att dialogen syns och att dess effekt körts hade då ingen tagit —
 * panelen under såg dialogen överst och lät bli, dialogen lyssnade inte än.
 */
let lyssnar = false
function paEscape(e: KeyboardEvent): void {
  if (e.key !== 'Escape' || e.defaultPrevented) return
  const overst = oppna[oppna.length - 1]
  if (!overst) return
  const mal = e.target as HTMLElement | null
  if (textfalt(mal) && overst.rot?.contains(mal)) {
    // Första Escape lämnar fältet. Nästa stänger.
    mal?.blur()
    return
  }
  e.preventDefault()
  overst.stang()
}

function textfalt(el: Element | null): boolean {
  if (!el) return false
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true
  return (
    el.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|file)$/.test((el as HTMLInputElement).type)
  )
}

const FOKUSERBART =
  'input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

export function Verktygsyta(props: {
  yta: Yta
  titel: string
  underrubrik?: string
  /** Stänger ytan utan att göra något. Escape och ✕ går hit när ingen `sekundar` finns. */
  onStang: () => void
  fot: Fot
  /** Extra klass på dialogen, t.ex. för en bredare import. */
  klass?: string
  children: ComponentChildren
}) {
  const rot = useRef<HTMLElement>(null)
  const id = useRef(Symbol('yta'))
  const { yta, onStang, fot } = props
  // Avbryt när det finns något att avstå från, Stäng när ytan bara visar.
  const sekundar = fot.sekundar ?? { etikett: fot.primar ? t('Avbryt') : t('Stäng'), kor: onStang }

  // Escape ska köra den senaste stängningen, inte den från ritningen när
  // ytan öppnades.
  const stang = useRef(sekundar.kor)
  stang.current = sekundar.kor

  // Registrering och fokus. Layout-effekten körs innan skärmen målas, så
  // fokus hinner aldrig synas på fel ställe och Escape har en ägare från
  // första ögonblicket.
  useLayoutEffect(() => {
    const mitt = id.current
    // Elementet hämtas nu: vid avmonteringen kan referensen redan vara tömd.
    const el = rot.current
    oppna.push({ id: mitt, rot: el, stang: () => stang.current() })
    if (!lyssnar) {
      window.addEventListener('keydown', paEscape)
      lyssnar = true
    }
    const fore = document.activeElement as HTMLElement | null
    if (yta === 'dialog') {
      const forsta = el?.querySelector<HTMLElement>(`.modal__kropp :is(${FOKUSERBART})`)
      ;(forsta ?? el)?.focus()
    }
    return () => {
      const i = oppna.findIndex((o) => o.id === mitt)
      if (i >= 0) oppna.splice(i, 1)
      // Tillbaka dit man kom ifrån — men bara om fokus faktiskt ligger i
      // ytan eller fallit bort. Har användaren klickat någon annanstans
      // under tiden är det valet som gäller.
      const nu = document.activeElement
      if (nu !== null && nu !== document.body && !el?.contains(nu)) return
      if (fore && fore.isConnected && fore !== document.body) {
        fore.focus()
        return
      }
      // Den som öppnade panelen från en meny hade menyns knapp i fokus, och
      // den finns inte längre. Rutnätet är då rätt plats att landa på: det är
      // det panelen verkade på.
      if (yta === 'panel') document.querySelector<HTMLElement>('[role=grid]')?.focus()
    }
  }, [yta])


  const onKeyDown = (e: KeyboardEvent) => {
    const mal = e.target as HTMLElement | null
    if (e.key === 'Enter' && fot.primar && !e.isComposing) {
      if (!mal || mal.tagName === 'TEXTAREA' || mal.tagName === 'SELECT') return
      if (mal.tagName === 'BUTTON' || mal.tagName === 'A' || mal.closest('[role=menu]')) return
      e.preventDefault()
      if (fot.primar.kan !== false) fot.primar.kor()
      return
    }
    if (e.key === 'Tab' && yta === 'dialog' && rot.current) {
      // Tabb-cykeln stannar i dialogen. Resten av sidan ligger under ett
      // överlägg och går ändå inte att klicka på.
      const alla = Array.from(rot.current.querySelectorAll<HTMLElement>(FOKUSERBART))
      if (alla.length === 0) return
      const forsta = alla[0]!
      const sista = alla[alla.length - 1]!
      if (e.shiftKey && document.activeElement === forsta) {
        e.preventDefault()
        sista.focus()
      } else if (!e.shiftKey && document.activeElement === sista) {
        e.preventDefault()
        forsta.focus()
      }
    }
  }

  const knapp = (k: Fotknapp, klass: string) => (
    <button
      class={`knapp${klass}`}
      disabled={k.kan === false}
      title={k.titel}
      onClick={k.kor}
      // Enter på en fokuserad knapp är knappens egen klickning, inte ytans.
    >
      {k.etikett}
    </button>
  )
  const p = yta === 'dialog' ? 'modal' : 'verktyg'
  const foten = (
    <div class={`${p}__fot yta__fot`}>
      {fot.destruktiv && knapp(fot.destruktiv, ' knapp--fara yta__fot-destruktiv')}
      <span class="yta__fot-mellan" />
      {fot.extra?.map((k) => knapp(k, ''))}
      {knapp(sekundar, '')}
      {fot.primar && knapp(fot.primar, fot.primar.fara ? ' knapp--primar knapp--fara' : ' knapp--primar')}
    </div>
  )
  const rubrik = (
    <div class={`${p}__rubrik`}>
      {yta === 'panel' ? (
        <div>
          <h2>{props.titel}</h2>
          {props.underrubrik && <span class="verktyg__underrubrik">{props.underrubrik}</span>}
        </div>
      ) : (
        <>
          <h2>{props.titel}</h2>
          {props.underrubrik && <span class="modal__underrubrik">{props.underrubrik}</span>}
        </>
      )}
      <button class="modal__stang" onClick={onStang} aria-label={t('Stäng')}>
        ✕
      </button>
    </div>
  )

  if (yta === 'panel') {
    return (
      <aside
        class="verktyg"
        aria-label={props.titel}
        ref={rot as { current: HTMLElement | null }}
        onKeyDown={onKeyDown}
      >
        {rubrik}
        <div class="verktyg__kropp">{props.children}</div>
        {foten}
      </aside>
    )
  }
  return (
    <div class="overlagg" onMouseDown={(e) => e.target === e.currentTarget && onStang()}>
      <div
        class={`modal${props.klass ? ` ${props.klass}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={props.titel}
        tabIndex={-1}
        ref={rot as { current: HTMLDivElement | null }}
        onKeyDown={onKeyDown}
      >
        {rubrik}
        <div class="modal__kropp">{props.children}</div>
        {foten}
      </div>
    </div>
  )
}
