import { computed, signal, type ReadonlySignal } from '@preact/signals'

/**
 * Vilken vy som ligger över rutnätet.
 *
 * Förut fanns sex fristående på/av-flaggor — pivot, slå ihop, jämför,
 * kombinera, verkstaden och översikten — och ingenting hindrade att flera var
 * sanna samtidigt. Vilken som *syntes* avgjordes av ordningen i en if/else-
 * kedja i `App`, och vilken Escape *stängde* av en annan kedja som skulle
 * hållas i samma ordning för hand. Den dagen de gled isär stängde Escape en
 * vy ingen såg medan den som syntes krävde ett andra tryck.
 *
 * Nu är det ett enda värde. Att öppna en vy ersätter den som var uppe, så
 * det kan aldrig finnas en dold vy under den synliga, och Escape stänger
 * alltid det man tittar på. Rutnätet är viloläget: det finns ingen flagga
 * för det, det är frånvaron av en vy.
 *
 * Vyernas egna moduler behåller sina `oppnaX`/`stangX` och sina `xOppen`,
 * men som tunna omslag över det här värdet. Det är vad som låter varje vy
 * fortsätta läsa "är jag uppe?" utan att känna till de andra.
 */
export type Vylage =
  | { typ: 'rutnat' }
  | { typ: 'oversikt' }
  | { typ: 'pivot' }
  | { typ: 'verkstad' }
  | { typ: 'slaihop' }
  | { typ: 'kombinera' }
  | { typ: 'jamfor' }

export type Vytyp = Vylage['typ']

const RUTNAT: Vylage = { typ: 'rutnat' }

export const vylage = signal<Vylage>(RUTNAT)

/** Sant när något annat än rutnätet visas. */
export const egenVy: ReadonlySignal<boolean> = computed(() => vylage.value.typ !== 'rutnat')

/** Öppnar en vy. Den som var uppe ersätts — två vyer kan aldrig vara öppna samtidigt. */
export function oppnaVy(lage: Vylage): void {
  vylage.value = lage
}

/**
 * Stänger vyn och går tillbaka till rutnätet.
 *
 * Med en typ stängs vyn bara om det är den som är uppe. `stangPivot()` från
 * en kodväg som inte vet att pivoten redan ersatts av något annat ska inte
 * stänga det andra — det vore samma fel som förut, fast åt andra hållet.
 */
export function stangVy(typ?: Vytyp): void {
  if (typ !== undefined && vylage.value.typ !== typ) return
  vylage.value = RUTNAT
}

/** En läsbar signal för "är just den här vyn uppe?", till vyernas egna moduler. */
export function arUppe(typ: Vytyp): ReadonlySignal<boolean> {
  return computed(() => vylage.value.typ === typ)
}
