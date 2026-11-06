import { useState } from 'preact/hooks'
import { fragan } from '../state/bekraftelse.js'
import { t } from './sprak.js'
import { Verktygsyta } from './yta/Verktygsyta.jsx'

/**
 * Dialogen som ritar `fragan` — se `state/bekraftelse.ts`.
 *
 * Den är en vanlig verktygsyta av sorten dialog: fokus går till fältet när
 * det finns ett, Enter är primärknappen, Escape är avbryt. Frågan är
 * nyckeln, så en ny fråga alltid börjar med sitt eget förvalda värde.
 */
export function Bekraftelse() {
  const f = fragan.value
  if (!f) return null
  return <Fragan key={f.rubrik + (f.falt?.varde ?? '')} f={f} />
}

function Fragan({ f }: { f: NonNullable<typeof fragan.value> }) {
  const [varde, setVarde] = useState(f.falt?.varde ?? '')
  const svar = () => f.svara(f.falt ? varde : '')
  return (
    <Verktygsyta
      yta="dialog"
      klass="modal--smal"
      titel={f.rubrik}
      onStang={() => f.svara(null)}
      fot={{
        primar: { etikett: f.ok, fara: f.fara, kor: svar },
        sekundar: { etikett: t('Avbryt'), kor: () => f.svara(null) },
      }}
    >
      {f.text && <p class="bekraftelse__text">{f.text}</p>}
      {f.falt && (
        <label class="falt">
          <span class="falt__etikett">{f.falt.etikett}</span>
          <input
            type="text"
            value={varde}
            onInput={(e) => setVarde((e.currentTarget as HTMLInputElement).value)}
          />
        </label>
      )}
    </Verktygsyta>
  )
}
