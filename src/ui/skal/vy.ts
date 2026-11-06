import type { ColumnId } from '../../core/types.js'
import { findColumn } from '../../core/frame/frame.js'
import { formatCount } from '../../core/locale/sv.js'
import { nyRegelId } from '../../core/ops/filter.js'
import { clearViewSpec, notify, sattFilter } from '../../state/store.js'
import { aterupptaVerkstad } from '../../state/matchning.js'
import { stangVy } from '../../state/vylage.js'
import { t, tf } from '../sprak.js'
import type { SkalLage } from './lage.js'

/* ---------- Vy ---------- */

/** Vyerna över rutnätet: stänga dem, ta upp verkstaden, visa ogiltiga rader. */
export function useVy({ tab, frame }: Pick<SkalLage, 'tab' | 'frame'>) {
  /**
   * Tar upp den parkerade verkstaden igen.
   *
   * Ett ställe, fyra ingångar: menyposten, palettkommandot, åtgärden i
   * notisen efter en körning och åtgärden i uppstartsnotisen efter en
   * omladdning. Synkningen sker inne i `aterupptaVerkstad` — det är den enda
   * punkt som körs när vyn varit stängd, och alltså den enda som kan upptäcka
   * att filerna ändrats under tiden.
   */
  /**
   * Stänger varje egen vy.
   *
   * Paletten går att öppna ovanpå vilken vy som helst, så dess kommandon kan
   * köras med en annan vy uppe. Allt som ska visa något i rutnätsläget —
   * verkstaden, sökraden, tabellverktygen — måste därför först ta sig dit:
   * en osynlig vy eller panel som äger tangentbordet är precis det felet den
   * härledda Escape-kedjan finns för att undvika.
   */
  // Vyn, inte sessionen: verkstadens arbete ligger kvar precis som vid Escape.
  const stangEgnaVyer = () => stangVy()

  const aterta = () => {
    stangEgnaVyer()
    const svar = aterupptaVerkstad()
    if (svar === 'omnumrerad') {
      notify(
        t(
          'Rader har lagts till eller tagits bort sedan sist, så verkstadens par pekade inte längre på rätt rader. De har kastats.',
        ),
        { ton: 'varning' },
      )
    } else if (svar === 'stangd') {
      notify(t('En av filerna är stängd, så det finns inga rader att beta av.'), { ton: 'varning' })
    }
  }

  const visaOgiltiga = (id: ColumnId) => {
    if (!tab || !frame) return
    // "Visa raderna som inte går att tolka" är en filterregel som alla andra
    // sedan etapp 4 — men den *ersätter* filtret i stället för att lägga sig
    // ovanpå, så att knappen betyder samma sak som den alltid gjort.
    sattFilter(tab, {
      koppling: 'alla',
      regler: [{ id: nyRegelId(), colId: id, operator: 'ogiltig', varde: '' }],
    })
    const col = findColumn(frame, id)
    notify(
      tf(
        'Visar {0} rader där ”{1}” inte går att tolka.',
        formatCount(frame.view.length),
        col?.name ?? '',
      ),
      { atgard: { etikett: t('Visa alla igen'), kor: () => tab && clearViewSpec(tab) } },
    )
  }

  return { stangEgnaVyer, aterta, visaOgiltiga }
}
