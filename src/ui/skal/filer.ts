import { useCallback, useRef } from 'preact/hooks'
import { sammaInnehall, unikFilnamn } from '../../core/frame/frame.js'
import { formatCount } from '../../core/locale/sv.js'
import { dataWorker } from '../../worker/client.js'
import { notify, openFrame, tabs } from '../../state/store.js'
import { mallTabId, vantarPaMall } from '../../state/kombinera.js'
import { EXEMPELFIL, EXEMPELFIL_MALL, EXEMPELFIL_ORDER } from '../exempel.js'
import type { ImportSettings } from '../ImportDialog.jsx'
import { t, tf } from '../sprak.js'
import type { SkalLage } from './lage.js'

/* ---------- Filer ---------- */

/** Filkön, inläsningen, exempelfilerna och text ur urklipp som ny fil. */
export function useFiler({ setKö, setLaddar }: Pick<SkalLage, 'setKö' | 'setLaddar'>) {
  const oppnaFiler = useCallback((files: File[]) => {
    const tillatna = files.filter(
      (f) => /\.(csv|txt|tsv|xlsx)$/i.test(f.name) || f.type.startsWith('text/'),
    )
    if (tillatna.length === 0) {
      notify(t('Verktyget öppnar CSV, TXT, TSV och Excel-filer (.xlsx).'), { ton: 'varning' })
      return
    }
    setKö((current) => [...current, ...tillatna])
  }, [])

  const laddaFil = async (file: File, settings: ImportSettings) => {
    setKö((current) => current.slice(1))
    setLaddar(file.name)
    try {
      const parsed = await dataWorker.parse(
        file,
        {
          delimiter: settings.delimiter,
          encoding: settings.encoding,
          trimFields: settings.trimFields,
          skipEmptyRows: settings.skipEmptyRows,
          headerRow: settings.headerRow,
        },
        undefined,
        /\.xlsx$/i.test(file.name)
          ? { sheet: settings.sheet, decimal: settings.decimal }
          : undefined,
      )
      /*
       * Samma fil två gånger är ett vanligt misstag när man hämtar exporter
       * ur flera system. Det sägs som en varning och inte som en fråga —
       * ibland *vill* man ha två kopior att jämföra, och en dialog som står
       * i vägen för det är värre än en mening som går att strunta i.
       * `duplicate-file` fanns redan som varningstyp.
       */
      const dubblett = tabs.value.find((t) => sammaInnehall(t.frame, parsed))
      if (dubblett) {
        parsed.meta.warnings.push({
          kind: 'duplicate-file',
          message: tf('Innehållet är identiskt med den redan öppna fliken ”{0}”.', dubblett.frame.name),
        })
      }
      if (inklistrade.current.has(file)) {
        parsed.name = unikFilnamn(
          tabs.value.map((t) => t.frame.name),
          parsed.name,
        )
      }
      const flik = openFrame(parsed)
      // Filen öppnades från kombineringsvyns "Öppna mallfil…". Den gick samma
      // väg som alla andra filer, genom importdialogen — en mall som lästs med
      // fel avgränsare blir annars en enda kolumn som heter hela rubrikraden.
      if (vantarPaMall.value) {
        mallTabId.value = flik.id
        vantarPaMall.value = false
      }
      const varningar = parsed.meta.warnings.filter((w) => w.kind !== 'encoding-uncertain')
      notify(
        tf(
          '{0} öppnad — {1} rader, {2} kolumner.',
          file.name,
          formatCount(parsed.rowCount),
          formatCount(parsed.columns.length),
        ) +
          (dubblett ? ` ${tf('Identisk med ”{0}”.', dubblett.frame.name)}` : '') +
          (varningar.length > (dubblett ? 1 : 0)
            ? ` ${
                varningar.length === 1
                  ? t('1 sak att titta på.')
                  : tf('{0} saker att titta på.', varningar.length)
              }`
            : ''),
        { ton: varningar.length > 0 ? 'varning' : 'info' },
      )
    } catch (error) {
      vantarPaMall.value = false
      notify(tf('Kunde inte öppna {0}: {1}', file.name, (error as Error).message), { ton: 'fara' })
    } finally {
      setLaddar(null)
    }
  }

  const exempelfil = (text: string, namn: string) =>
    new File([new Blob([text], { type: 'text/csv' })], namn, { type: 'text/csv' })

  const oppnaExempel = () => {
    setKö((current) => [...current, exempelfil(EXEMPELFIL, 'exempel-kunder.csv')])
  }

  /** Båda exempelfilerna, så att sammanslagningen går att prova direkt. */
  const oppnaExempelpar = () => {
    setKö((current) => [
      ...current,
      exempelfil(EXEMPELFIL, 'exempel-kunder.csv'),
      exempelfil(EXEMPELFIL_ORDER, 'exempel-order.csv'),
    ])
  }

  /** Exempelmallen, så att mallvägen går att prova utan egen fil. */
  const oppnaExempelmall = () => {
    vantarPaMall.value = true
    setKö((current) => [...current, exempelfil(EXEMPELFIL_MALL, 'exempel-mall.csv')])
  }

  /**
   * Filerna som kom ur urklippet, så att inläsningen känner igen dem.
   *
   * Namnet räknas ut när texten klistras in, men fliken från förra
   * inklistringen finns inte i fliklistan förrän filen lästs klart — så två
   * snabba inklistringar fick båda `Inklistrat 1`. Inläsningen räknar därför
   * om namnet i öppningsögonblicket, och bara för de här filerna: en riktig
   * fil som öppnas två gånger ska fortfarande heta vad den heter.
   */
  const inklistrade = useRef(new WeakSet<File>())

  /** Öppnar text från urklipp som en ny flik. */
  const oppnaText = (text: string, namn: string) => {
    const blob = new Blob([text], { type: 'text/csv' })
    const fil = new File([blob], namn, { type: 'text/csv' })
    inklistrade.current.add(fil)
    setKö((current) => [...current, fil])
  }

  return { oppnaFiler, laddaFil, oppnaExempel, oppnaExempelpar, oppnaExempelmall, oppnaText }
}
