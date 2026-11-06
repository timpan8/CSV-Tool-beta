import { signal } from '@preact/signals'

/**
 * Appens egna frågor: bekräfta, eller skriv ett värde.
 *
 * `window.confirm` och `window.prompt` gjorde jobbet förut, på fem ställen.
 * De är webbläsarens rutor: otematiserade, bara på det språk koden råkade
 * skriva, utanför appens Escape-regler och fokushantering, och i vissa
 * webbläsare går de att stänga av för gott med en kryssruta. Nu är frågan
 * data i en signal, och `Bekraftelse` ritar den som en vanlig dialog i
 * verktygsytan — samma fot, samma Enter och Escape som allt annat.
 *
 * En fråga i taget. Ställs en ny medan en står öppen får den gamla svaret
 * avbryt, så att inget löfte lämnas hängande.
 */
export interface Fraga {
  rubrik: string
  text?: string
  /** Finns fältet är frågan en prompt: svaret är texten, eller null vid avbryt. */
  falt?: { etikett: string; varde: string }
  /** Primärknappens text. */
  ok: string
  /** Röd primärknapp: det som bekräftas tar bort något. */
  fara?: boolean
}

export interface Oppen extends Fraga {
  svara: (svar: string | null) => void
}

export const fragan = signal<Oppen | null>(null)

function stall(f: Fraga): Promise<string | null> {
  fragan.value?.svara(null)
  return new Promise((ok) => {
    fragan.value = {
      ...f,
      svara: (svar) => {
        fragan.value = null
        ok(svar)
      },
    }
  })
}

/** Ja eller nej. Escape och Avbryt ger falskt. */
export async function bekrafta(f: Omit<Fraga, 'falt'>): Promise<boolean> {
  return (await stall(f)) !== null
}

/** Ett värde, eller null om frågan avbröts. */
export function fragaText(f: Fraga & { falt: NonNullable<Fraga['falt']> }): Promise<string | null> {
  return stall(f)
}
