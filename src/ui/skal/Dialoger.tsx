import { borjaOm, notify, openFrame, undo } from '../../state/store.js'
import { klistraIn } from '../../state/edits.js'
import { vantarPaMall } from '../../state/kombinera.js'
import { rect } from '../../state/selection.js'
import { BorjaOmDialog } from '../BorjaOmDialog.jsx'
import { ExportDialog } from '../ExportDialog.jsx'
import { GrupperaDialog } from '../GrupperaDialog.jsx'
import { ImportDialog } from '../ImportDialog.jsx'
import { Kommandopalett } from '../Kommandopalett.jsx'
import { PasteDialog } from '../PasteDialog.jsx'
import { ProfilDialog } from '../ProfilDialog.jsx'
import { Installningar } from './Installningar.jsx'
import { celler, t, tf } from '../sprak.js'
import type { Handlingar } from './handlingar.js'
import type { SkalLage } from './lage.js'

/** Dialogerna och paletten: var och en ritas bara när dess läge säger det. */
export function Dialoger({ s, h, begransad }: { s: SkalLage; h: Handlingar; begransad: boolean }) {
  const {
    tab,
    frame,
    kö,
    setKö,
    palettOppen,
    setPalettOppen,
    lagen,
    profilerOppna,
    setProfilerOppna,
    sammanfatta,
    setSammanfatta,
    exportOppen,
    setExportOppen,
    borjaOmOppen,
    setBorjaOmOppen,
    installningarOppna,
    setInstallningarOppna,
    inklistring,
    setInklistring,
  } = s
  const { laddaFil, klistraInSomNyFil } = h
  return (
    <>
      {installningarOppna && (
        <Installningar
          onStang={() => setInstallningarOppna(false)}
          onGlomSparat={() => lagen.current.kommandon.find((k) => k.id === 'glomsparat')?.kor()}
          onBorjaOm={() => {
            setInstallningarOppna(false)
            setBorjaOmOppen(true)
          }}
        />
      )}
      {kö.length > 0 && (
        <ImportDialog
          file={kö[0]!}
          onAvbryt={() => {
            vantarPaMall.value = false
            setKö((current) => current.slice(1))
          }}
          onOppna={(settings) => void laddaFil(kö[0]!, settings)}
        />
      )}

      {palettOppen && (
        <Kommandopalett
          kommandon={lagen.current.kommandon}
          onStang={() => setPalettOppen(false)}
        />
      )}

      {profilerOppna && tab && (
        <ProfilDialog tab={tab} onStang={() => setProfilerOppna(false)} />
      )}

      {sammanfatta && frame && (
        <GrupperaDialog
          frame={frame}
          startkolumn={sammanfatta.startkolumn}
          onStang={() => setSammanfatta(null)}
          onSkapa={(resultat, text) => {
            setSammanfatta(null)
            openFrame(resultat)
            notify(text)
          }}
        />
      )}

      {exportOppen && frame && (
        <ExportDialog
          frame={frame}
          harFilter={begransad}
          ordning={tab?.ordning?.rader}
          onStang={() => setExportOppen(false)}
          onExporterad={() => {
            setExportOppen(false)
            if (tab) tab.smutsig = false
            notify(t('Filen laddades ner.'))
          }}
        />
      )}

      {borjaOmOppen && (
        <BorjaOmDialog
          onAvbryt={() => setBorjaOmOppen(false)}
          onBorjaOm={() => {
            // Rutan stängs inte: sidan laddas om, och en ruta som försvinner
            // strax innan allt ritas om ser bara ut som ett hack.
            void borjaOm()
          }}
        />
      )}

      {inklistring && tab && (
        <PasteDialog
          plan={inklistring.plan}
          markeradeRader={rect(inklistring.sel).r2 - rect(inklistring.sel).r1 + 1}
          markeradeKolumner={rect(inklistring.sel).k2 - rect(inklistring.sel).k1 + 1}
          onAvbryt={() => setInklistring(null)}
          onNyFil={() => {
            const text = inklistring.text
            setInklistring(null)
            klistraInSomNyFil(text)
          }}
          onKlistraIn={(utoka) => {
            const andrade = klistraIn(tab, inklistring.sel, inklistring.plan, utoka)
            setInklistring(null)
            notify(tf('Klistrade in {0}.', celler(andrade)), {
              atgard: { etikett: t('Ångra'), kor: () => tab && undo(tab) },
            })
          }}
        />
      )}
    </>
  )
}
