import type { Column } from '../../core/types.js'
import { notify, undo } from '../../state/store.js'
import { uppdateraRegler, vaxlaRegel } from '../../state/edits.js'
import { inaktuellaRegler, regellageFor } from '../../state/regel.js'
import type { MenyPost } from '../parts.jsx'
import { celler, kolumner as kolumnerText, t, tf } from '../sprak.js'
import { nuLage } from './lage.js'
import type { useStadverktyg } from './stadverktyg.js'

/* ---------- Mallkolumner ---------- */

/** Kolumner byggda ur en mall: fylla på nytt, och deras menyposter. */
export function useMallkolumner({
  oppnaVerktyg,
}: Pick<ReturnType<typeof useStadverktyg>, 'oppnaVerktyg'>) {
  /**
   * Fyller mallkolumner på nytt.
   *
   * Körs direkt i stället för att öppna panelen: det är ett klick på en knapp
   * som säger vad den gör, körningen är ett enda ångra-steg, och notisen bär
   * en Ångra. Att först visa en förhandsvisning av *samma mall som redan står
   * på kolumnen* hade varit en fråga utan innehåll.
   */
  const uppdateraMallkolumner = (valda?: Column[]) => {
    const nu = nuLage()
    if (!nu) return
    const lista = valda ?? inaktuellaRegler(nu.tab).map((r) => r.col)
    if (lista.length === 0) return
    const { andrade, korda, saknade } = uppdateraRegler(nu.tab, lista)

    for (const s of saknade) {
      notify(
        tf('{0} kunde inte uppdateras: mallen pekar på {1}, som inte finns.', s.namn, s.kolumner.join(', ')),
        { ton: 'varning' },
      )
    }
    if (korda.length === 0) return
    notify(
      andrade === 0
        ? tf('{0} var redan aktuell.', korda[0]!.name)
        : tf('Uppdaterade {0} — {1} ändrades.', kolumnerText(korda.length), celler(andrade)),
      andrade === 0 ? {} : { atgard: { etikett: t('Ångra'), kor: () => undo(nu.tab) } },
    )
  }

  /**
   * Posterna för en kolumn som är byggd ur en mall. Tom lista annars.
   *
   * En avstängd mall får en enda post — vägen tillbaka. Att visa *Uppdatera*
   * och *Ändra* på något som är av vore att erbjuda handlingar som inte har
   * någon verkan.
   */
  const regelposter = (col: Column): (MenyPost | 'avdelare')[] => {
    const nu = nuLage()
    if (!nu || !col.regel) return []
    if (col.regel.avstangd) {
      return [
        'avdelare',
        {
          etikett: t('Slå på mallen igen'),
          skal: col.regel.mall,
          kor: () => vaxlaRegel(nu.tab, col, false),
        },
      ]
    }
    const lage = regellageFor(nu.tab, col)
    const trasig = (lage?.saknade.length ?? 0) > 0
    return [
      'avdelare',
      {
        etikett: t('Uppdatera ur mallen'),
        skal: trasig
          ? tf('mallen pekar på {0}, som inte finns', lage!.saknade.join(', '))
          : lage?.inaktuell
            ? t('källorna har ändrats sedan kolumnen fylldes')
            : t('källorna är oförändrade'),
        inaktiv: trasig ? t('Mallen går inte att köra.') : undefined,
        kor: () => uppdateraMallkolumner([col]),
      },
      {
        etikett: t('Ändra mallen…'),
        skal: col.regel.mall,
        kor: () => oppnaVerktyg('slaihop', [col.id]),
      },
      {
        etikett: t('Stäng av mallen'),
        skal: t('kolumnen slutar följa sina källor, men mallen finns kvar'),
        kor: () => vaxlaRegel(nu.tab, col, true),
      },
    ]
  }

  return { uppdateraMallkolumner, regelposter }
}
