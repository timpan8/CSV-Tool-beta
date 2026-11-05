import { useEffect } from 'preact/hooks'
import { clearViewSpec, notify, undo } from '../../state/store.js'
import { sattMarkering } from '../../state/edits.js'
import { korGenvag } from '../kommandon.js'
import { celler, t, tf } from '../sprak.js'
import type { Handlingar } from './handlingar.js'
import { nuLage, type SkalLage } from './lage.js'

/**
 * Fält där man faktiskt skriver.
 *
 * En kryssruta har taggen INPUT men bär ingen text, och en Escape där ska
 * stänga vyn som vanligt — aliaskartans beslutskolumn är kryssrutor, och en
 * Escape som inte gör något är värre än ingen Escape alls.
 */
function iTextfalt(el: HTMLElement | null): boolean {
  if (el === null) return false
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true
  return (
    el.tagName === 'INPUT' && !/^(checkbox|radio|button|submit)$/.test((el as HTMLInputElement).type)
  )
}

/* ---------- Tangentbord ---------- */

/** Fönstrets tangentbordshanterare: paletten, menyn, egna vyer, registret och rutnätet. */
export function useTangentbord({
  tab,
  frame,
  rev,
  lagen,
  sokOppen,
  palettOppen,
  oversiktOppen,
  setPalettOppen,
  setMeny,
  setSokOppen,
  markering,
  synligaKolumner,
  flyttaMarkering,
  startaRedigering,
  cellmenyposter,
}: Pick<
  SkalLage,
  | 'tab'
  | 'frame'
  | 'rev'
  | 'lagen'
  | 'sokOppen'
  | 'palettOppen'
  | 'oversiktOppen'
  | 'setPalettOppen'
  | 'setMeny'
  | 'setSokOppen'
> &
  Pick<
    Handlingar,
    'markering' | 'synligaKolumner' | 'flyttaMarkering' | 'startaRedigering' | 'cellmenyposter'
  >) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const iFalt = target !== null && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)
      const mod = e.ctrlKey || e.metaKey

      // Paletten öppnas före allt annat. Den är vägen in för den som vet vad
      // hen vill göra men inte var knappen sitter, och då duger det inte att
      // den kräver en öppen fil eller att man först stängt en egen vy.
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalettOppen((oppen) => !oppen)
        return
      }
      /*
       * Paletten har egna tangenter: pilarna väljer i listan och Escape
       * stänger. Rutnätets genvägar får inte gå igång bakom den.
       *
       * Escape hanteras här och inte bara i palettens fält, eftersom fältet
       * kan sakna fokus: under den korta stunden innan fokus landat, och
       * efteråt om man klickat någon annanstans. En Escape som ibland inte
       * stänger är värre än ingen Escape alls.
       */
      if (lagen.current.palett) {
        if (e.key === 'Escape') {
          e.preventDefault()
          setPalettOppen(false)
        }
        return
      }

      /*
       * En öppen meny äger Escape. Står fokus i menyn tar den hand om
       * tangenten själv och stoppar händelsen; hit kommer den bara när fokus
       * hamnat någon annanstans. Utan det gick Escape vidare till rutnätet,
       * som inte gör någonting med den, och menyn blev omöjlig att stänga
       * med tangentbordet.
       */
      if (lagen.current.meny) {
        if (e.key === 'Escape') {
          e.preventDefault()
          setMeny(null)
        }
        return
      }

      /*
       * En egen vy äger tangentbordet, precis som paletten och menyn ovan.
       *
       * Rutnätet finns inte på skärmen. Utan den här grenen tömde Delete celler
       * i en flik man inte tittar på, Ctrl+Z ångrade där, och `preventDefault`
       * på Enter tog knapparna i vyn deras aktivering — vyn gick alltså inte
       * att köra med tangentbordet.
       *
       * Vilken vy som är överst avgörs under ritningen och läses ur `lagen`,
       * så att den här kedjan inte kan hamna i en annan ordning än den som
       * faktiskt ritas.
       *
       * Escape hanteras här och inte med en lyssnare i varje vy. En lyssnare
       * registrerad i en effekt finns först efter ritningen, och två lyssnare
       * på samma fönster betyder att ett Escape stänger både paletten och vyn
       * under den. Kedjan här har redan gjort `return` för paletten och menyn,
       * så det kan inte hända.
       */
      const stangEgenVy = lagen.current.stangEgenVy
      if (stangEgenVy) {
        // Escape i ett textfält betyder "lämna fältet", inte "riv vyn".
        // Aliaskartans namnfält skriver igenom vid varje tecken, så det finns
        // inget utkast att ångra — men att slå sönder en halvbyggd karta för
        // att fokus råkade ligga i ett fält vore värre. Andra Escape stänger.
        if (e.key === 'Escape') {
          e.preventDefault()
          if (iTextfalt(target)) target?.blur()
          else stangEgenVy()
        }
        return
      }

      const nu = nuLage()
      if (!nu) return
      const { tab, sel: markering } = nu

      /*
       * Genvägarna bor i registret. Ctrl+Z, Ctrl+S, Ctrl+F, Ctrl+X, Ctrl+C,
       * Ctrl+D, Ctrl+A och Delete är kommandon med en genväg, inte fall i en
       * switch — samma lista som paletten visar och menyerna skriver ut.
       */
      if (korGenvag(lagen.current.kommandon, e, iFalt)) return
      // Övriga modifierade tangenter lämnas åt webbläsaren.
      if (mod) return

      if (iFalt) return

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          flyttaMarkering(-1, 0, e.shiftKey, e.altKey)
          break
        case 'ArrowDown':
          e.preventDefault()
          flyttaMarkering(1, 0, e.shiftKey, e.altKey)
          break
        case 'ArrowLeft':
          e.preventDefault()
          flyttaMarkering(0, -1, e.shiftKey, e.altKey)
          break
        case 'ArrowRight':
          e.preventDefault()
          flyttaMarkering(0, 1, e.shiftKey, e.altKey)
          break
        case 'Home':
          e.preventDefault()
          flyttaMarkering(0, -1, e.shiftKey, true)
          break
        case 'End':
          e.preventDefault()
          flyttaMarkering(0, 1, e.shiftKey, true)
          break
        case 'Enter':
        case 'F2':
          e.preventDefault()
          startaRedigering()
          break
        case 'Delete':
        case 'Backspace':
          if (markering) {
            e.preventDefault()
            const andrade = sattMarkering(tab, markering, '')
            if (andrade > 0) {
              notify(tf('Tömde {0}.', celler(andrade)), {
                atgard: { etikett: t('Ångra'), kor: () => tab && undo(tab) },
              })
            }
          }
          break
        case 'ContextMenu':
        case 'F10':
          // Menytangenten, och Skift+F10 för tangentbord som saknar den.
          // Menyn öppnas vid fokuscellen, inte vid pekaren.
          if (markering && (e.key === 'ContextMenu' || e.shiftKey)) {
            e.preventDefault()
            const ruta = document.querySelector('.rutnat__cell--fokus')?.getBoundingClientRect()
            setMeny({
              x: ruta ? ruta.left : 120,
              y: ruta ? ruta.bottom : 120,
              poster: cellmenyposter(markering.fokusRad, markering.fokusKol),
            })
          }
          break
        case 'Escape':
          if (lagen.current.sok) {
            setSokOppen(false)
            clearViewSpec(tab)
          }
          break
        default:
          // Börja skriva direkt i en markerad cell, som i ett kalkylark.
          if (e.key.length === 1 && !e.altKey && markering && !tab.redigerar) {
            startaRedigering()
          }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tab, frame, markering, synligaKolumner.length, sokOppen, palettOppen, oversiktOppen, rev])
}
