import { STADNINGAR } from '../../core/ops/clean.js'
import {
  hittaDubbletter,
  overflodigaRader,
  type Behall,
  type Dubblettnyckel,
} from '../../core/ops/duplicates.js'
import { TOMT_FILTER } from '../../core/ops/filter.js'
import { notify, sattDubbletter, sattFilter, setActiveColumn, undo } from '../../state/store.js'
import {
  laggTillLopnummer,
  selectedRows,
  stadaKolumner,
  taBortRader,
  taBortTommaKolumner,
  taBortTommaRader,
} from '../../state/edits.js'
import { rect } from '../../state/selection.js'
import { celler, kolumner as kolumnerText, rader as raderText, t, tf } from '../sprak.js'
import { nuLage, type SkalLage } from './lage.js'

/* ---------- Rader ---------- */

/** Radåtgärderna: ta bort, städa, löpnummer, och de som gör en vy permanent. */
export function useRader({
  tab,
  frame,
  egnaBehallna,
  setEgnaBehallna,
  setTabellverktyg,
}: Pick<SkalLage, 'tab' | 'frame' | 'egnaBehallna' | 'setEgnaBehallna' | 'setTabellverktyg'>) {
  const taBortMarkeradeRader = () => {
    const nu = nuLage()
    if (!nu || !nu.sel) return
    const rader = selectedRows(nu.tab, nu.sel)
    if (rader.length === 0) return
    taBortRader(nu.tab, rader)
    notify(tf('Tog bort {0}.', raderText(rader.length)), {
      atgard: { etikett: t('Ångra'), kor: () => undo(nu.tab) },
    })
  }

  const stadaTommaRader = () => {
    if (!tab) return
    const n = taBortTommaRader(tab)
    notify(
      n === 0
        ? t('Inga helt tomma rader hittades.')
        : tf('Tog bort {0} som var helt tomma.', raderText(n)),
      n > 0 ? { atgard: { etikett: t('Ångra'), kor: () => tab && undo(tab) } } : undefined,
    )
  }

  const stadaTommaKolumner = () => {
    if (!tab) return
    const n = taBortTommaKolumner(tab)
    notify(
      n === 0
        ? t('Inga helt tomma kolumner hittades.')
        : tf('Tog bort {0} som var helt tomma.', kolumnerText(n)),
      n > 0 ? { atgard: { etikett: t('Ångra'), kor: () => tab && undo(tab) } } : undefined,
    )
  }

  /**
   * Lägger till en kolumn med 1, 2, 3 …
   *
   * Notisen säger antalet, eftersom det är den enda siffran som säger om man
   * körde kommandot på rätt fil — på en miljon rader syns ingen skillnad i
   * rutan, men kolumnen kostar minne som allt annat.
   */
  const laggTillNummerkolumn = () => {
    if (!tab) return
    const col = laggTillLopnummer(tab)
    setActiveColumn(col.id)
    notify(tf('Lade till {0} med löpnummer 1–{1}.', col.name, tab.frame.rowCount), {
      atgard: { etikett: t('Ångra'), kor: () => tab && undo(tab) },
    })
  }

  const stada = (id: string) => {
    const nu = nuLage()
    if (!nu || !nu.sel) return
    const { tab } = nu
    const stadning = STADNINGAR.find((s) => s.id === id)
    if (!stadning) return
    const r = rect(nu.sel)
    const kolumner = nu.kolumner.slice(r.k1, r.k2 + 1)
    const andrade = stadaKolumner(tab, kolumner, stadning)
    if (andrade === 0) {
      notify(tf('{0}: inget att ändra i markeringen.', t(stadning.etikett)))
      return
    }
    notify(
      tf(
        '{0} — {1} ändrades i {2}.',
        t(stadning.etikett),
        celler(andrade),
        kolumner.length === 1 ? `”${kolumner[0]!.name}”` : kolumnerText(kolumner.length),
      ),
      { atgard: { etikett: t('Ångra'), kor: () => undo(tab) } },
    )
  }

  /**
   * Gör filtrets urval permanent.
   *
   * Filtret rensas efteråt: en vy som inte längre döljer någonting ser
   * trasig ut, precis som dubblettvyn utan dubbletter kvar. Raderna går att
   * ångra; vyn ligger utanför historiken, som all annan vy-inställning.
   */
  const tillampaUrval = (behall: boolean) => {
    const nu = nuLage()
    if (!nu) return
    const synliga = new Set(nu.frame.view)
    const bort: number[] = []
    for (let r = 0; r < nu.frame.rowCount; r++) {
      if (synliga.has(r) !== behall) bort.push(r)
    }
    if (bort.length === 0) {
      notify(behall ? 'Alla rader visas redan.' : 'Det finns inga rader att ta bort.')
      return
    }
    taBortRader(nu.tab, bort)
    sattFilter(nu.tab, TOMT_FILTER)
    setTabellverktyg(null)
    notify(
      behall
        ? tf(
            'Behöll {0} och tog bort {1}.',
            raderText(nu.frame.rowCount),
            raderText(bort.length),
          )
        : tf('Tog bort {0}.', raderText(bort.length)),
      { atgard: { etikett: t('Ångra'), kor: () => undo(nu.tab) } },
    )
  }

  /**
   * Tar bort de överflödiga raderna i varje dubblettgrupp.
   *
   * Vyn stängs efteråt: en dubblettvy utan dubbletter kvar ser trasig ut,
   * som om verktyget tappat bort sig.
   */
  const taBortDubbletter = (nyckel: Dubblettnyckel, hur: Behall) => {
    const nu = nuLage()
    if (!nu || !frame) return
    const grupper = hittaDubbletter(frame, nyckel)
    // Handvalen gäller bara i valda-läget. Under »första«/»sista« ritas inga
    // ringar, och gamla val från ett tidigare läge ska inte vinna i smyg.
    const bort = overflodigaRader(
      grupper,
      hur === 'valda' ? 'forsta' : hur,
      hur === 'valda' ? egnaBehallna : undefined,
    )
    if (bort.length === 0) return
    taBortRader(nu.tab, bort)
    sattDubbletter(nu.tab, null)
    setEgnaBehallna(new Map())
    setTabellverktyg(null)
    notify(tf('Tog bort {0} som var dubbletter.', raderText(bort.length)), {
      atgard: { etikett: t('Ångra'), kor: () => undo(nu.tab) },
    })
  }

  return {
    taBortMarkeradeRader,
    stadaTommaRader,
    stadaTommaKolumner,
    laggTillNummerkolumn,
    stada,
    tillampaUrval,
    taBortDubbletter,
  }
}
