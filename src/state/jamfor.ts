import { arUppe, oppnaVy, stangVy } from './vylage.js'

/**
 * Om jämförelsevyn är öppen.
 *
 * Samma resonemang som sammanslagningen (`slaihop.ts`): vyn håller inget
 * arbete över tid, den läser raderna i körningsögonblicket, så det finns
 * inget att spara och inget som kan bli inaktuellt.
 */
export const jamforOppen = arUppe('jamfor')

export function oppnaJamfor(): void {
  oppnaVy({ typ: 'jamfor' })
}

export function stangJamfor(): void {
  stangVy('jamfor')
}
