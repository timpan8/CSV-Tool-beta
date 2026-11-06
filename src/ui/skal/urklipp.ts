import { useEffect } from 'preact/hooks'
import { tabs } from '../../state/store.js'
import type { Handlingar } from './handlingar.js'
import type { SkalLage } from './lage.js'

/* ---------- Urklipp och släpp ---------- */

/** Fönstrets inklistring, filsläpp och varningen innan sidan lämnas. */
export function useUrklipp({
  tab,
  rev,
  lagen,
  setSlappOver,
  markering,
  oppnaFiler,
  klistraInSomNyFil,
  forbereKlistraIn,
}: Pick<SkalLage, 'tab' | 'rev' | 'lagen' | 'setSlappOver'> &
  Pick<Handlingar, 'markering' | 'oppnaFiler' | 'klistraInSomNyFil' | 'forbereKlistraIn'>) {
  useEffect(() => {
    /*
     * Skift-tangenten läses ur tangentnedslaget, inte ur inklistringen.
     *
     * `ClipboardEvent` bär inga modifierare, och urklippet går bara att läsa
     * ur just den händelsen utan att be om behörighet. Nedslaget kommer
     * omedelbart före, så flaggan sätts där och läses här. Den nollställs
     * efter varje inklistring, så en gammal skift-tryckning kan inte leva
     * kvar och kapa nästa Ctrl+V.
     */
    const skift = { pa: false }
    const onKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') skift.pa = e.shiftKey
    }
    const onPaste = (e: ClipboardEvent) => {
      const somNyFil = skift.pa
      skift.pa = false
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return
      const text = e.clipboardData?.getData('text/plain') ?? ''
      if (text.trim() === '') return
      e.preventDefault()
      // Samma spärr som tangentbordskedjan: i en egen vy finns rutnätet inte
      // på skärmen, och en inklistring får inte skriva i celler man inte ser.
      // Texten blir en ny flik i stället — som när ingen fil är öppen.
      if (somNyFil || !tab || lagen.current.stangEgenVy) klistraInSomNyFil(text)
      else forbereKlistraIn(text)
    }
    window.addEventListener('keydown', onKeydown, true)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('keydown', onKeydown, true)
      window.removeEventListener('paste', onPaste)
    }
  }, [tab, markering, rev])

  useEffect(() => {
    const over = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return
      e.preventDefault()
      setSlappOver(true)
    }
    const leave = (e: DragEvent) => {
      if (e.relatedTarget === null) setSlappOver(false)
    }
    const drop = (e: DragEvent) => {
      // En släppzon i en vy (SlaIhops tomma läge) har redan tagit hand om
      // händelsen — annars öppnades samma fil två gånger.
      if (e.defaultPrevented) {
        setSlappOver(false)
        return
      }
      e.preventDefault()
      setSlappOver(false)
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length > 0) oppnaFiler(files)
    }
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [oppnaFiler])

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (tabs.value.some((t) => t.smutsig)) e.preventDefault()
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [])
}
