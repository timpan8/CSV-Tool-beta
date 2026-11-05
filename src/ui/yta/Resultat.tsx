import type { ComponentChildren } from 'preact'
import { t } from '../sprak.js'

/**
 * Sammanfattningen och filterknapparna, delade av alla verktyg.
 *
 * Siffran och möjligheten att se just de berörda raderna hör ihop: ett tal
 * utan väg till raderna bakom sig är en uppmaning att lita på verktyget, och
 * det är precis vad det här gränssnittet försöker slippa be om.
 */
export function Resultat(props: {
  /** Sammanfattningen i ord. */
  children: ComponentChildren
  visaBara: 'andrade' | 'problem' | undefined
  onVisaBara: (v: 'andrade' | 'problem' | undefined) => void
  andrade: number
  problem: number
  /** Etiketterna för de två filterknapparna. */
  etikettAndrade?: string
  etikettProblem?: string
}) {
  const knapp = (
    varde: 'andrade' | 'problem' | undefined,
    etikett: string,
    avstangd: boolean,
  ) => (
    <button
      class={`val__knapp${props.visaBara === varde ? ' val__knapp--vald' : ''}`}
      role="radio"
      aria-checked={props.visaBara === varde}
      disabled={avstangd}
      onClick={() => props.onVisaBara(varde)}
    >
      {etikett}
    </button>
  )

  return (
    <div class="falt">
      <span class="falt__etikett">{t('Vad som händer')}</span>
      <p class="verktyg__sammanfattning verktyg__resultat">{props.children}</p>
      <div class="val" role="radiogroup">
        {knapp(undefined, t('Alla rader'), false)}
        {knapp('andrade', t(props.etikettAndrade ?? 'Bara ändrade'), props.andrade === 0)}
        {props.etikettProblem !== undefined &&
          knapp('problem', t(props.etikettProblem), props.problem === 0)}
      </div>
    </div>
  )
}
