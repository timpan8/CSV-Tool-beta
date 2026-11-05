import {
  canRedo,
  canUndo,
  harFilter,
  harSortering,
  redo,
  undo,
  verktygsfalt,
} from '../../state/store.js'
import { oppnaJamfor } from '../../state/jamfor.js'
import { oppnaKombinera } from '../../state/kombinera.js'
import { sessionslage } from '../../state/matchning.js'
import { oppnaPivot } from '../../state/pivot.js'
import { oppnaSlaIhop } from '../../state/slaihop.js'
import { Redigeringsfalt } from '../Redigeringsfalt.jsx'
import type { Handlingar } from './handlingar.js'
import type { SkalLage } from './lage.js'
import { flerfilsmeny, stadMeny } from './menyer.js'

/*
 * Redigeringsfältet byggs en gång och placeras efter inställningen: som en
 * rad under flikarna, eller som första spalt i arbetsytan. Samma element,
 * två platser — det är inställningen som väljer, inte två uppsättningar
 * knappar.
 *
 * Över flerfilsvyerna finns det inte alls, inte ens som en rad avstängda
 * knappar. Det lodräta läget ligger inne i arbetsytan, som vyerna ersätter,
 * så radläget får försvinna på samma sätt — annars beter sig de två lägena
 * olika. Och på en 720 px-skärm är raden precis den höjd som slå ihop-vyn
 * behöver för att visa alla sina inställningar utan att rulla.
 */
export function byggRedigeringsfalt({
  tab,
  frame,
  setMeny,
  setSammanfatta,
  dubblettgrupper,
  stada,
  stadaTommaRader,
  stadaTommaKolumner,
  oppnaTabellverktyg,
  aterta,
  egenVy,
}: Pick<SkalLage, 'tab' | 'frame' | 'setMeny' | 'setSammanfatta'> &
  Pick<
    Handlingar,
    | 'dubblettgrupper'
    | 'stada'
    | 'stadaTommaRader'
    | 'stadaTommaKolumner'
    | 'oppnaTabellverktyg'
    | 'aterta'
  > & { egenVy: boolean }) {
  return (
    frame && tab && !egenVy ? (
      <Redigeringsfalt
        lage={verktygsfalt.value}
        angra={{ kan: canUndo(tab), antal: tab.cursor, kor: () => undo(tab) }}
        goraOm={{ kan: canRedo(tab), kor: () => redo(tab) }}
        sortera={{
          antal: harSortering(tab) ? tab.viewSpec.sortering!.length : 0,
          kor: () => oppnaTabellverktyg('sortera'),
        }}
        filter={{
          antal: harFilter(tab) ? tab.viewSpec.filter!.regler.length : 0,
          kor: () => oppnaTabellverktyg('filter'),
        }}
        dubbletter={{
          antal: dubblettgrupper ? dubblettgrupper.antalGrupper : null,
          kor: () => oppnaTabellverktyg('dubbletter'),
        }}
        stada={(x, y) =>
          setMeny({
            x,
            y,
            poster: stadMeny(stada, { tommaRader: stadaTommaRader, tommaKolumner: stadaTommaKolumner }),
          })
        }
        fleraFiler={(x, y) =>
          setMeny({
            x,
            y,
            poster: flerfilsmeny({
              slaIhop: () => oppnaSlaIhop(),
              jamfor: () => oppnaJamfor(),
              kombinera: () => oppnaKombinera(),
              mall: () => oppnaKombinera(true),
              session: sessionslage(),
              aterta,
            }),
          })
        }
        sammanfatta={() => setSammanfatta({ startkolumn: null })}
        pivot={() => oppnaPivot()}
      />
    ) : null
  )
}
