import { theme } from '../../state/store.js'
import { KANAL, STABIL_URL, VERSION } from '../../version.js'
import { IkonExportera, IkonKugghjul, IkonMane, IkonProfiler, IkonSol } from '../ikoner.jsx'
import { sattSprak, sprak, t } from '../sprak.js'
import { FilValjare } from './Flikrad.jsx'
import type { Handlingar } from './handlingar.js'
import type { SkalLage } from './lage.js'
import { installningsmeny } from './menyer.js'

/** App-raden överst: namn, öppna, profiler, exportera, språk, tema, inställningar. */
export function Verktygsrad({
  frame,
  setProfilerOppna,
  setExportOppen,
  setMeny,
  oppnaFiler,
  egenVy,
}: Pick<SkalLage, 'frame' | 'setProfilerOppna' | 'setExportOppen' | 'setMeny'> &
  Pick<Handlingar, 'oppnaFiler'> & { egenVy: boolean }) {
  return (
    <div class="verktygsrad">
      <span class="verktygsrad__namn">
        <span class="verktygsrad__logga" aria-hidden="true">
          ▤
        </span>
        CSV-verkstan
      </span>
      {KANAL === 'beta' && (
        /*
         * Beta-märket är en länk till den stabila utgåvan. Den som fastnar
         * i något halvfärdigt ska ha en väg till verktyget som fungerar,
         * ett klick bort och inte i en README.
         */
        <a
          class="verktygsrad__kanal"
          href={STABIL_URL}
          title={t('Det här är betaversionen. Klicka för den stabila.')}
        >
          Beta <span class="verktygsrad__version">{VERSION}</span>
        </a>
      )}

      {/*
        App-raden bär filens ärenden: öppna, spara arbetsgången, skriva ut.
        Allt som verkar på innehållet står i redigeringsfältet nedanför —
        det finns bara när det finns ett innehåll att verka på. Längst till
        höger det som gäller verktyget självt: språk, tema, inställningar.
      */}
      <FilValjare onFiler={oppnaFiler} />
      <button
        class="knapp knapp--ikon"
        disabled={!frame || egenVy}
        title={t('Spara den här filens arbetsgång och kör om den på nästa fil.')}
        onClick={() => setProfilerOppna(true)}
      >
        <IkonProfiler />
        {t('Profiler…')}
      </button>
      <button
        class="knapp knapp--ikon"
        disabled={!frame || egenVy}
        title={t('Skriv ut filen som Excel eller CSV.')}
        onClick={() => setExportOppen(true)}
      >
        <IkonExportera />
        {t('Exportera')}
      </button>

      <div class="verktygsrad__horn">
        {/*
          Språkvalet visar båda språken och markerar det aktiva. Den gamla
          knappen visade nästa språk — "EN" när man var på svenska — och
          gick att läsa åt båda hållen.
        */}
        <div
          class="sprakval"
          role="radiogroup"
          aria-label={t('Språk')}
          title={t(
            'Gränssnittets text byter språk. Sortering, tal och datum följer alltid svenska regler.',
          )}
        >
          {(['sv', 'en'] as const).map((s) => (
            <button
              key={s}
              class={`sprakval__val${sprak.value === s ? ' sprakval__val--valt' : ''}`}
              role="radio"
              aria-checked={sprak.value === s}
              onClick={() => sattSprak(s)}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          class="knapp knapp--ikon knapp--rund"
          title={t('Ljust eller mörkt läge')}
          aria-label={t('Ljust eller mörkt läge')}
          onClick={() => {
            theme.value = theme.value === 'dark' ? 'light' : 'dark'
          }}
        >
          {theme.value === 'dark' ? <IkonSol /> : <IkonMane />}
        </button>
        <button
          class="knapp knapp--ikon knapp--rund"
          title={t('Inställningar')}
          aria-label={t('Inställningar')}
          onClick={(e) => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
            setMeny({ x: r.left, y: r.bottom + 4, poster: installningsmeny() })
          }}
        >
          <IkonKugghjul />
        </button>
      </div>
    </div>
  )
}
