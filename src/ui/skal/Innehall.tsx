import { bekrafta } from '../../state/bekraftelse.js'
import type { JSX } from 'preact'
import type { Column } from '../../core/types.js'
import {
  notify,
  openFrame,
  setActiveColumn,
  setSelection,
  sparaNu,
  tabs,
  touch,
  undoThrough,
  vaxlaSortering,
  verktygsfalt,
} from '../../state/store.js'
import {
  antecknaOmgang,
  bokforResultatflik,
  lamnaVerkstad,
  ogjortArbete,
  oppnaVerkstad,
  verkstad,
} from '../../state/matchning.js'
import { stangPivot } from '../../state/pivot.js'
import { stangSlaIhop } from '../../state/slaihop.js'
import { oppnaVy, stangVy, vylage } from '../../state/vylage.js'
import { ColumnPanel } from '../ColumnPanel.jsx'
import { EmptyState } from '../EmptyState.jsx'
import { VirtualGrid } from '../grid/VirtualGrid.jsx'
import { Jamfor } from '../Jamfor.jsx'
import { Kombinera } from '../Kombinera.jsx'
import { Oversikt } from '../Oversikt.jsx'
import { Felgrans } from '../parts.jsx'
import { Pivot } from '../Pivot.jsx'
import { SlaIhop } from '../SlaIhop.jsx'
import { t, tf } from '../sprak.js'
import { Verkstad } from '../Verkstad.jsx'
import type { Handlingar } from './handlingar.js'
import { Hogerpanel } from './Hogerpanel.jsx'
import type { SkalLage } from './lage.js'

/**
 * Arbetsytan: den vy som ligger överst, annars rutnätet med sina paneler,
 * annars det tomma läget. Vilken det blir avgörs av `vylage`.
 */
export function Innehall({
  s,
  h,
  redigeringsfalt,
  verktygKolumner,
  aktivKolumn,
}: {
  s: SkalLage
  h: Handlingar
  /** Redigeringsfältet i sitt lodräta läge, eller null. Se `byggRedigeringsfalt`. */
  redigeringsfalt: JSX.Element | null
  verktygKolumner: Column[]
  aktivKolumn: Column | null
}) {
  const { tab, frame, rev, behall, setMeny, setEgnaBehallna, oversiktOppen } = s
  const {
    oppnaFiler,
    oppnaExempel,
    oppnaExempelpar,
    oppnaExempelmall,
    aterta,
    sattTyp,
    visaOgiltiga,
    oppnaVerktyg,
    vaxlaDold,
    flyttaKolumn,
    infogaKolumn,
    inaktuellaRegelIder,
    dubblettgrupper,
    behallnaRader,
    markering,
    kolumnmenyposter,
    cellmenyposter,
    radmenyposter,
    tomrumsmeny,
    andraBredd,
    anpassaKolumnbredd,
    cyklaTyp,
    startaRedigering,
    avslutaRedigering,
  } = h
  const vy = vylage.value.typ
  // Verkstaden och kombineringen lägger sig över arbetsytan. Rutnätets egna
  // kontroller — sök, filterrad, statusrad och tabellverktygen — hör till en
  // tabell man inte längre tittar på, och skulle visa tal som inte gäller.
  const iVerkstaden = vy === 'verkstad'
  const iKombinera = vy === 'kombinera'
  const iSlaIhop = vy === 'slaihop'
  const iJamfor = vy === 'jamfor'
  const iPivot = vy === 'pivot'

  return (
    iJamfor ? (
      <Jamfor
        flikar={tabs.value.map((t) => ({ id: t.id, frame: t.frame, tab: t }))}
        aktivId={tab?.id ?? null}
        onKlar={(text, angra) =>
          notify(text, angra ? { atgard: { etikett: t('Ångra'), kor: angra } } : undefined)
        }
      />
    ) : iSlaIhop ? (
      <SlaIhop
        flikar={tabs.value.map((t) => ({ id: t.id, frame: t.frame }))}
        aktivId={tab?.id ?? null}
        onFiler={oppnaFiler}
        onExempelpar={oppnaExempelpar}
        onSlaIhop={(resultat, text) => {
          openFrame(resultat)
          notify(text)
        }}
        onVerkstad={async (vansterTabId, hogerTabId, par, val) => {
          const vansterTab = tabs.value.find((t) => t.id === vansterTabId)
          const hogerTab = tabs.value.find((t) => t.id === hogerTabId)
          if (!vansterTab || !hogerTab) return
          /*
           * En ny sammanslagning skriver över den parkerade sessionen, och
           * det finns bara en. Utan frågan här hade precis den förlust som
           * `lamnaVerkstad` infördes för att stoppa kommit tillbaka genom en
           * annan dörr — efter att foten uttryckligen lovat motsatsen.
           */
          const gamla = verkstad.value
          const ogjort = gamla ? ogjortArbete(gamla) : 0
          if (
            ogjort > 0 &&
            !(await bekrafta({
              rubrik: t('Börja om sammanslagningen?'),
              text: tf(
                'Den påbörjade sammanslagningen {0} ↔ {1} har {2} beslut som inte finns någon annanstans.',
                gamla!.vansterNamn,
                gamla!.hogerNamn,
                ogjort,
              ),
              ok: t('Börja om'),
              fara: true,
            }))
          ) {
            return
          }
          stangSlaIhop()
          oppnaVerkstad(vansterTab, hogerTab, par, val)
        }}
      />
    ) : iKombinera ? (
      <Kombinera
        onKlar={(resultat, text) => {
          openFrame(resultat)
          notify(text)
        }}
        onFiler={oppnaFiler}
        onExempelmall={oppnaExempelmall}
      />
    ) : oversiktOppen && frame && tab ? (
      <Oversikt
        frame={frame}
        revision={rev}
        onValjKolumn={setActiveColumn}
        onSetType={sattTyp}
        onVisaOgiltiga={visaOgiltiga}
        onVerktyg={oppnaVerktyg}
        onStang={() => stangVy('oversikt')}
      />
    ) : iPivot && frame ? (
      /*
       * `key` på flikens id, så att pivoten byggs om från grunden när man
       * byter fil: den nya fliken hämtar sin egen plan, eller fyra tomma
       * rutor. Nyckeln sitter på **gränsen** och inte på vyn inuti — ett
       * fångat fel lever i gränsens tillstånd, och en gräns utan egen nyckel
       * hade behållit felläget även efter att man bytt till en annan fil.
       */
      <Felgrans key={tab?.id} onStang={stangPivot}>
        <Pivot
          tabId={tab?.id ?? ''}
          frame={frame}
          revision={rev}
          onNyFlik={(resultat, text) => {
            openFrame(resultat)
            // Stäng vyn: fliken är hela poängen med knappen, och att bli kvar
            // i pivoten hade sett ut som att ingenting hände.
            stangPivot()
            notify(text)
          }}
          onStang={stangPivot}
        />
      </Felgrans>
    ) : iVerkstaden ? (
      <Verkstad
        onSlaIhop={(resultat, text) => {
          // Alltid en ny flik, aldrig en skrivning i en befintlig. Det är
          // det som gör att sessionen får leva vidare utan att en färdig
          // resultatflik kan ändras under händerna på den som tittar.
          const flik = openFrame(resultat)
          // Bokför fliken i sessionen, så att vägen tillbaka till resten
          // syns även när man står i det färdiga resultatet.
          bokforResultatflik(flik.id)
          // Skriv fliken direkt: omgångsräknaren nedan sparas efter 800 ms
          // och får inte hinna före resultatet den påstår finns.
          sparaNu()
          antecknaOmgang()
          notify(text, {
            // Notisen är enda platsen som säger att resten finns kvar, och
            // den försvinner. Med en åtgärd lever den dubbelt så länge och
            // blir dessutom vägen tillbaka i stället för bara ett besked.
            atgard: verkstad.value
              ? { etikett: t('Beta av resten'), kor: () => aterta() }
              : undefined,
          })
        }}
        onStang={lamnaVerkstad}
      />
    ) : frame && tab ? (
      <div
        class={`arbetsyta arbetsyta--med-inspektor${
          verktygKolumner.length > 0 ? ' arbetsyta--med-verktyg' : ''
        }${verktygsfalt.value === 'lodrat' ? ' arbetsyta--lodrat' : ''}`}
      >
        {verktygsfalt.value === 'lodrat' && redigeringsfalt}
        <ColumnPanel
          frame={frame}
          tab={tab}
          activeColumnId={tab.activeColumnId}
          onSelect={setActiveColumn}
          onToggleHidden={vaxlaDold}
          onMove={flyttaKolumn}
          onInsert={() => infogaKolumn()}
          onUndoThrough={(i) => undoThrough(tab, i)}
          onOversikt={() => oppnaVy({ typ: 'oversikt' })}
        />
        <VirtualGrid
          frame={frame}
          revision={rev}
          activeColumnId={tab.activeColumnId}
          viewSpec={tab.viewSpec}
          forhandsvisning={tab.forhandsvisning}
          sortering={tab.viewSpec.sortering ?? []}
          inaktuellaRegler={inaktuellaRegelIder}
          grupper={dubblettgrupper}
          behallnaRader={behallnaRader}
          onBehall={
            behall === 'valda' && dubblettgrupper
              ? (fysisk) => {
                  const g = dubblettgrupper.grupp[fysisk] ?? 0
                  if (g === 0) return
                  setEgnaBehallna((nu) => new Map(nu).set(g, fysisk))
                }
              : null
          }
          markering={markering}
          redigerar={tab.redigerar}
          onSelectColumn={setActiveColumn}
          onOpenColumnMenu={(id, x, y) => setMeny({ x, y, poster: kolumnmenyposter(id) })}
          onOpenCellMenu={(rad, kol, x, y) =>
            setMeny({ x, y, poster: cellmenyposter(rad, kol) })
          }
          onOpenRowMenu={(x, y) => setMeny({ x, y, poster: radmenyposter() })}
          onOpenTomrumMenu={(x, y) => setMeny({ x, y, poster: tomrumsmeny() })}
          onMoveColumn={flyttaKolumn}
          onResizeColumn={andraBredd}
          onAutofit={anpassaKolumnbredd}
          onCycleType={cyklaTyp}
          onSortera={(id, lagg) => vaxlaSortering(tab, id, lagg)}
          onSelect={(sel) => setSelection(tab, sel)}
          onStartEdit={startaRedigering}
          onCommitEdit={avslutaRedigering}
          onCancelEdit={() => {
            tab.redigerar = null
            touch()
          }}
        />
        <Hogerpanel
          s={s}
          h={h}
          tab={tab}
          frame={frame}
          verktygKolumner={verktygKolumner}
          aktivKolumn={aktivKolumn}
        />
      </div>
    ) : (
      <EmptyState
        onFiler={oppnaFiler}
        onExempel={oppnaExempel}
        onExempelpar={oppnaExempelpar}
      />
    )
  )
}
