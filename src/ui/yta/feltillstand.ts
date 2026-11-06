import type { Feltillstand } from '../../core/ops/dates.js'

export type { Feltillstand }

/**
 * Vad som händer med ett värde verktyget inte kan tolka.
 *
 * Datum, tal och telefon ställer samma fråga, och svaret betyder samma sak
 * i alla tre. Listan stod förut i varje verktyg för sig, med tre olika
 * hjälptexter för samma val.
 */
export const FELTILLSTAND: { varde: Feltillstand; etikett: string; titel: string }[] = [
  {
    varde: 'behall',
    etikett: 'Låt stå',
    titel: 'Värdet lämnas precis som det är. Du ser själv vilka rader som behöver ses över.',
  },
  { varde: 'markera', etikett: 'Skriv OGILTIGT', titel: 'Gör raderna lätta att filtrera fram efteråt.' },
  { varde: 'tom', etikett: 'Töm cellen', titel: 'Tar bort värdet helt.' },
]
