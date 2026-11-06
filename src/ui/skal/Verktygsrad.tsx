import { KANAL, STABIL_URL, VERSION } from '../../version.js'
import { IkonExportera, IkonKugghjul, IkonProfiler } from '../ikoner.jsx'
import { sattSprak, sprak, t } from '../sprak.js'
import { FilValjare } from './Flikrad.jsx'
import type { Handlingar } from './handlingar.js'
import type { SkalLage } from './lage.js'

/** App-raden överst: namn, öppna, profiler, exportera, språk, tema, inställningar. */
export function Verktygsrad({
  frame,
  setProfilerOppna,
  setExportOppen,
  setInstallningarOppna,
  oppnaFiler,
  egenVy,
}: Pick<SkalLage, 'frame' | 'setProfilerOppna' | 'setExportOppen' | 'setInstallningarOppna'> &
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
        {/*
          Ett kugghjul, en dialog. Sol/måne-knappen som stod här kunde bara
          växla mellan ljust och mörkt; dialogen har alla tre temalägena,
          och tätheten, som förut inte gick att nå alls.
        */}
        <button
          class="knapp knapp--ikon knapp--rund"
          title={t('Inställningar')}
          aria-label={t('Inställningar')}
          onClick={() => setInstallningarOppna(true)}
        >
          <IkonKugghjul />
        </button>
      </div>
    </div>
  )
}
