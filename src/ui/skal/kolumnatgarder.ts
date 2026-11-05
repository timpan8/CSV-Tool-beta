import type { ColumnId, ColumnType } from '../../core/types.js'
import {
  columnIndex,
  duplicateColumn,
  findColumn,
  insertColumn,
  moveColumn,
  removeColumn,
  uniqueColumnName,
} from '../../core/frame/frame.js'
import { dopOmIRegel } from '../../core/ops/columns.js'
import type { Profilsteg } from '../../core/ops/profil.js'
import { bumpaUtseende, notify, runStep, setActiveColumn, touch, undo } from '../../state/store.js'
import { anpassadBredd } from '../grid/bredd.js'
import { t, tf } from '../sprak.js'
import type { SkalLage } from './lage.js'

const TYPCYKEL: ColumnType[] = ['text', 'number', 'date', 'email', 'bool']

/* ---------- Kolumnåtgärder ---------- */

/** Kolumnåtgärderna, var och en som ett ångringsbart steg. */
export function useKolumnatgarder({ tab, frame }: Pick<SkalLage, 'tab' | 'frame'>) {
  /**
   * Kör en kolumnåtgärd som ett ångringsbart steg.
   *
   * `profil` är samma ändring uttryckt som data. Åtgärder utan beskrivning —
   * flytta, infoga och duplicera — går inte att köra om på en annan fil utan
   * att gissa: positionen och namnet ”Ny kolumn” betyder ingenting där.
   */
  const kor = (
    label: string,
    kind: string,
    apply: () => void,
    revert: () => void,
    profil?: Profilsteg,
  ) => {
    if (!tab) return
    runStep(tab, { label, kind, apply, revert, profil })
  }

  const flyttaKolumn = (id: ColumnId, toIndex: number) => {
    if (!frame) return
    const col = findColumn(frame, id)
    if (!col) return
    const from = columnIndex(frame, id)
    if (from === toIndex) return
    kor(
      `Flyttade kolumnen ${col.name}`,
      'move',
      () => moveColumn(frame, id, toIndex),
      () => moveColumn(frame, id, from),
    )
  }

  const vaxlaDold = (id: ColumnId) => {
    if (!frame) return
    const col = findColumn(frame, id)
    if (!col) return
    const nyDold = !col.hidden
    kor(
      `${nyDold ? 'Dolde' : 'Visade'} kolumnen ${col.name}`,
      'hide',
      () => {
        col.hidden = nyDold
      },
      () => {
        col.hidden = !nyDold
      },
      { typ: 'doljKolumn', kolumn: col.name, dold: nyDold },
    )
  }

  const infogaKolumn = (atIndex?: number) => {
    if (!frame) return
    const namn = uniqueColumnName(frame.columns.map((c) => c.name), 'Ny kolumn')
    const index = atIndex ?? frame.columns.length
    let skapad: ColumnId | null = null
    kor(
      `Infogade kolumnen ${namn}`,
      'insert',
      () => {
        const col = insertColumn(frame, namn, index)
        skapad = col.id
        setActiveColumn(col.id)
      },
      () => {
        if (skapad) removeColumn(frame, skapad)
      },
    )
  }

  const taBortKolumn = (id: ColumnId) => {
    if (!frame || !tab) return
    const col = findColumn(frame, id)
    if (!col) return
    const index = columnIndex(frame, id)
    kor(
      `Tog bort kolumnen ${col.name}`,
      'drop',
      () => {
        removeColumn(frame, id)
      },
      () => {
        frame.columns.splice(index, 0, col)
      },
      { typ: 'taBortKolumn', kolumn: col.name },
    )
    notify(tf('Kolumnen ”{0}” togs bort.', col.name), {
      atgard: { etikett: t('Ångra'), kor: () => tab && undo(tab) },
    })
  }

  const dopOmKolumn = (id: ColumnId) => {
    if (!frame) return
    const col = findColumn(frame, id)
    if (!col) return
    const svar = window.prompt(`Nytt namn för kolumnen ”${col.name}”`, col.name)
    if (svar === null) return
    const nytt = uniqueColumnName(
      frame.columns.filter((c) => c.id !== id).map((c) => c.name),
      svar,
    )
    const gammalt = col.name
    if (nytt === gammalt) return
    /*
     * Mallar som läser kolumnen skrivs om i samma steg.
     *
     * Utan det hade en omdöpning tyst brutit varje regel som nämner
     * kolumnen — ett handgrepp som inte har med mallen att göra hade förstört
     * den. Ångra tar tillbaka både namnet och mallarna, eftersom de ändras i
     * samma steg.
     */
    const berorda = frame.columns
      .map((c) => ({ col: c, fore: c.regel, efter: c.regel ? dopOmIRegel(c.regel, gammalt, nytt) : null }))
      .filter((b) => b.efter !== null)
    kor(
      `Bytte namn: ${gammalt} → ${nytt}`,
      'rename',
      () => {
        col.name = nytt
        for (const b of berorda) b.col.regel = b.efter!
      },
      () => {
        col.name = gammalt
        for (const b of berorda) b.col.regel = b.fore
      },
      { typ: 'dopOm', kolumn: gammalt, till: nytt },
    )
  }

  const dupliceraKolumn = (id: ColumnId) => {
    if (!frame) return
    const col = findColumn(frame, id)
    if (!col) return
    let skapad: ColumnId | null = null
    kor(
      `Duplicerade kolumnen ${col.name}`,
      'duplicate',
      () => {
        skapad = duplicateColumn(frame, id)?.id ?? null
      },
      () => {
        if (skapad) removeColumn(frame, skapad)
      },
    )
  }

  const sattTyp = (id: ColumnId, typ: ColumnType) => {
    if (!frame) return
    const col = findColumn(frame, id)
    // Att välja den typ kolumnen redan har är inte ett tomt val: det låser
    // den, så att automatisk omtolkning inte gör 01234 till ett tal.
    if (!col || (col.type === typ && col.typeLocked)) return
    const gammal = col.type
    const gammalLast = col.typeLocked
    kor(
      `Satte typ på ${col.name}: ${typ}`,
      'type',
      () => {
        col.type = typ
        // Ett manuellt val ska inte skrivas över av automatisk omtolkning.
        col.typeLocked = true
      },
      () => {
        col.type = gammal
        col.typeLocked = gammalLast
      },
      { typ: 'sattTyp', kolumn: col.name, kolumntyp: typ },
    )
  }

  const cyklaTyp = (id: ColumnId) => {
    if (!frame) return
    const col = findColumn(frame, id)
    if (!col) return
    sattTyp(id, TYPCYKEL[(TYPCYKEL.indexOf(col.type) + 1) % TYPCYKEL.length]!)
  }

  /**
   * Bredd efter innehållet.
   *
   * Går genom `andraBredd` och hamnar därför inte i ångra-historiken —
   * bredd är utseende, inte data.
   */
  const anpassaKolumnbredd = (id: ColumnId) => {
    if (!frame) return
    const col = findColumn(frame, id)
    if (!col) return
    const bredd = anpassadBredd(col, frame)
    if (bredd !== null) andraBredd(id, bredd)
  }

  const andraBredd = (id: ColumnId, bredd: number) => {
    if (!frame) return
    const col = findColumn(frame, id)
    if (!col) return
    // Bredd är utseende, inte data, och hör inte hemma i ångra-historiken —
    // annars känns Ctrl+Z trasigt när den backar en kolumnbredd. Men den ska
    // sparas, och det är `bumpaUtseende` som ser till det.
    col.width = bredd
    if (tab) bumpaUtseende(tab)
    else touch()
  }

  return {
    flyttaKolumn,
    vaxlaDold,
    infogaKolumn,
    taBortKolumn,
    dopOmKolumn,
    dupliceraKolumn,
    sattTyp,
    cyklaTyp,
    anpassaKolumnbredd,
    andraBredd,
  }
}
