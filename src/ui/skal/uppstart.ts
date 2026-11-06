import { useEffect } from 'preact/hooks'
import { aterstallFlikar, glomSparat, notify } from '../../state/store.js'
import { aterstallVerkstad, sessionslage } from '../../state/matchning.js'
import { filer as filerText, t, tf } from '../sprak.js'
import type { Handlingar } from './handlingar.js'

/** Det som händer en gång vid start: flikarna och verkstaden från förra besöket. */
export function useUppstart({ aterta }: Pick<Handlingar, 'aterta'>) {
  /*
   * Flikarna från förra besöket läses tillbaka en gång, vid start.
   *
   * Notisen säger två saker och båda behövs: att filerna kom tillbaka, och
   * att ångra-historiken inte gjorde det. Det andra är sådant man annars
   * upptäcker genom att trycka Ctrl+Z och se att ingenting händer.
   */
  useEffect(() => {
    let avbruten = false
    void aterstallFlikar().then(async (antal) => {
      if (avbruten) return
      if (antal > 0) {
        notify(
          tf('{0} från förra besöket är tillbaka. Ångra-historiken börjar om.', filerText(antal)),
          { atgard: { etikett: t('Glöm sparade filer'), kor: () => void glomSparat() } },
        )
      }
      // Efter flikarna, aldrig före: sessionen slår upp sina flik-id i `tabs`,
      // och en uppslagning som misslyckas skulle se ut som en stängd fil.
      if (await aterstallVerkstad()) {
        if (avbruten) return
        const l = sessionslage()
        if (l.lage === 'redo' && l.ogjort > 0) {
          notify(tf('En påbörjad sammanslagning {0} finns kvar med {1} beslut.', l.namn, l.ogjort), {
            atgard: { etikett: t('Beta av resten'), kor: () => aterta() },
          })
        }
      }
    })
    return () => {
      avbruten = true
    }
  }, [])
}
