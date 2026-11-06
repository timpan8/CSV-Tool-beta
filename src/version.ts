/**
 * Vilken utgåva det här bygget är.
 *
 * Beta och stabil är **samma kod med en byggflagga**, inte två grenar som
 * glider isär. `VITE_KANAL=beta` sätts i beta-repots CI; allt annat bygger
 * som stabilt. Det är hela skälet att den här filen finns: koden som flyttas
 * från beta till stable ska inte behöva skrivas om på vägen.
 *
 * Kanalen styr tre saker. Märket i app-raden, så att den som testar ser
 * vilken utgåva som är öppen. Dokumentets titel, så att flikarna i
 * webbläsaren går att skilja åt. Och **lagringsprefixet**: beta och stable
 * ligger på samma ursprung (`timpan8.github.io`), så utan egna nycklar hade
 * de läst och skrivit över varandras sparade flikar, profiler och
 * inställningar — en beta som kan förstöra det stabila verktygets data är
 * ingen beta, det är en risk.
 *
 * Profilfilens format (`csv-verkstan-profil`) hör **inte** hit. Det är ett
 * filformat som ska gå att öppna i båda utgåvorna, inte en lagringsplats.
 */
export type Kanal = 'stabil' | 'beta'

export const KANAL: Kanal = import.meta.env.VITE_KANAL === 'beta' ? 'beta' : 'stabil'

/** Versionen ur `package.json`, insatt vid bygget. */
export const VERSION: string = __VERSION__

/** Prefixet för allt som sparas i webbläsaren: localStorage-nycklar och IndexedDB-namnet. */
export const LAGRINGSPREFIX = KANAL === 'beta' ? 'csv-verkstan-beta' : 'csv-verkstan'

/** Den stabila utgåvan, som beta-märket länkar till. */
export const STABIL_URL = 'https://timpan8.github.io/CSV-Tool/'
