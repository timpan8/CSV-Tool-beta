import { useEffect, useRef, useState } from 'preact/hooks'
import { formatCount } from '../../core/locale/sv.js'
import { activeTabId, closeTab, dopOmFlik, tabs, type Tab } from '../../state/store.js'
import { kastaVerkstad, ogjortArbete, verkstad, verkstadForFlik } from '../../state/matchning.js'
import { IkonOppna } from '../ikoner.jsx'
import type { MenyPost } from '../parts.jsx'
import { t, tf } from '../sprak.js'
import type { SkalLage } from './lage.js'

/** Flikraden: en knapp per öppen flik, med namnfält och meny. */
export function Flikrad({
  tab,
  dopOmFlikId,
  setDopOmFlikId,
  setMeny,
}: Pick<SkalLage, 'tab' | 'dopOmFlikId' | 'setDopOmFlikId' | 'setMeny'>) {
  return (
    <>
      {tabs.value.length > 0 && (
        <div class="flikrad">
          {tabs.value.map((t) => (
            <FlikKnapp
              key={t.id}
              tab={t}
              aktiv={t.id === tab?.id}
              iVerkstad={verkstadForFlik(t.id) !== null}
              redigerar={dopOmFlikId === t.id}
              onBorjaDopOm={() => setDopOmFlikId(t.id)}
              onKlarDopOm={() => setDopOmFlikId(null)}
              onMeny={(x, y) => setMeny({ x, y, poster: flikmeny(t, () => setDopOmFlikId(t.id)) })}
            />
          ))}
        </div>
      )}
    </>
  )
}

export function FilValjare({ onFiler }: { onFiler: (files: File[]) => void }) {
  return (
    <label class="knapp knapp--ikon">
      <IkonOppna />
      {t('Öppna')}
      <input
        type="file"
        accept=".csv,.txt,.tsv,.xlsx,text/csv,text/plain"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = Array.from((e.currentTarget as HTMLInputElement).files ?? [])
          if (files.length > 0) onFiler(files)
          ;(e.currentTarget as HTMLInputElement).value = ''
        }}
      />
    </label>
  )
}

/**
 * Flikens meny: samma två saker som fliken själv kan, som text.
 *
 * Dubbelklicket och krysset finns kvar, men en meny är det man provar när
 * man inte vet att dubbelklicket finns — och den kan säga vad F2 gör.
 */
function flikmeny(tab: Tab, borjaDopOm: () => void): (MenyPost | 'avdelare')[] {
  return [
    { etikett: t('Byt namn…'), genvag: 'F2', kor: borjaDopOm },
    'avdelare',
    { etikett: t('Stäng'), kor: () => stangFlik(tab) },
  ]
}

/** Stänger fliken, med samma frågor oavsett om det var krysset eller menyn. */
function stangFlik(tab: Tab): void {
  if (
    tab.smutsig &&
    !window.confirm(`${tab.frame.name} har ändringar som inte exporterats. Stänga ändå?`)
  ) {
    return
  }
  /*
   * En stängd källfil tar verkstaden med sig.
   *
   * Sessionen bär fysiska radindex in i just den här ramen; utan den
   * finns inget att para ihop. Förut låg sessionen kvar som en zombie
   * med två döda flik-id och gick varken att nå eller städa, och
   * menyraden sa "ingen påbörjad sammanslagning" fast det fanns en.
   */
  const s = verkstad.value
  const iSession = s !== null && (s.vansterTabId === tab.id || s.hogerTabId === tab.id)
  if (iSession) {
    const ogjort = ogjortArbete(s)
    if (
      ogjort > 0 &&
      !window.confirm(
        `${tab.frame.name} används av en påbörjad sammanslagning med ${ogjort} beslut. Stänger du fliken går de förlorade.`,
      )
    ) {
      return
    }
    kastaVerkstad()
  }
  closeTab(tab.id)
}

function FlikKnapp({
  tab,
  aktiv,
  iVerkstad,
  redigerar,
  onBorjaDopOm,
  onKlarDopOm,
  onMeny,
}: {
  tab: Tab
  aktiv: boolean
  /** Fliken hör till en påbörjad sammanslagning med rader kvar. */
  iVerkstad: boolean
  /** Namnet redigeras i ett fält i stället för att visas. */
  redigerar: boolean
  onBorjaDopOm: () => void
  onKlarDopOm: () => void
  onMeny: (x: number, y: number) => void
}) {
  return (
    <span
      class={`flik${aktiv ? ' flik--aktiv' : ''}`}
      onContextMenu={(e) => {
        e.preventDefault()
        onMeny(e.clientX, e.clientY)
      }}
    >
      {redigerar ? (
        <Fliknamnsfalt tab={tab} onKlar={onKlarDopOm} />
      ) : (
        <button
          class="flik__namn"
          style={{
            border: 0,
            background: 'transparent',
            padding: 0,
            color: 'inherit',
            font: 'inherit',
          }}
          title={t('Dubbelklicka för att byta namn')}
          onClick={() => {
            activeTabId.value = tab.id
          }}
          onDblClick={onBorjaDopOm}
        >
          {tab.smutsig && '● '}
          {tab.frame.name || t('Namnlös')}
        </button>
      )}
      {/*
        Märket följer med fliken, så att det syns även när man står i en helt
        annan fil. Utan det vore chippet i statusraden osynligt tills man
        råkade klicka på rätt flik.
      */}
      {iVerkstad && (
        <span class="flik__verkstad" title={t('Påbörjad sammanslagning med rader kvar att beta av')}>
          ⟡
        </span>
      )}
      <span class="flik__antal">{formatCount(tab.frame.rowCount)}</span>
      <button
        class="flik__stang"
        aria-label={tf('Stäng {0}', tab.frame.name)}
        onClick={() => stangFlik(tab)}
      >
        ✕
      </button>
    </span>
  )
}

/**
 * Namnfältet i fliken.
 *
 * Enter och blur sparar, Escape kastar. Ett fält i fliken i stället för en
 * dialog, eftersom namnet är det enda som ändras och det står redan där.
 * Sparas inget — tomt fält, samma namn — står det gamla kvar utan besked;
 * det är ingen händelse.
 */
function Fliknamnsfalt({ tab, onKlar }: { tab: Tab; onKlar: () => void }) {
  const [namn, setNamn] = useState(tab.frame.name)
  const falt = useRef<HTMLInputElement>(null)
  // Escape avmonterar fältet, och avmonteringen ger ett blur — som annars
  // hade sparat det man just kastade.
  const klar = useRef(false)
  useEffect(() => {
    falt.current?.focus()
    falt.current?.select()
  }, [])
  const spara = () => {
    if (klar.current) return
    klar.current = true
    dopOmFlik(tab, namn)
    onKlar()
  }
  return (
    <input
      ref={falt}
      class="flik__namnfalt"
      aria-label={tf('Nytt namn för {0}', tab.frame.name)}
      value={namn}
      onInput={(e) => setNamn((e.currentTarget as HTMLInputElement).value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          spara()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          klar.current = true
          onKlar()
        }
        // Rutnätets tangentbordsgenvägar ska inte se tangenterna.
        e.stopPropagation()
      }}
      onBlur={spara}
    />
  )
}

