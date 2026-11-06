import { lagringsfel } from '../../state/lagring.js'
import { tathet, theme, verktygsfalt } from '../../state/store.js'
import { KANAL, STABIL_URL, VERSION } from '../../version.js'
import { Val } from '../parts.jsx'
import { sattSprak, sprak, t } from '../sprak.js'
import { Verktygsyta } from '../yta/Verktygsyta.jsx'

/**
 * Inställningarna, som en dialog.
 *
 * Kugghjulet öppnade förut en liten meny med två val, och sol/måne-knappen
 * bredvid kunde bara växla mellan ljust och mörkt — *följer systemet* låg
 * i menyn. Tätheten fanns som inställning i lagringen men ingenstans i
 * gränssnittet. Här står allt som gäller verktyget självt på ett ställe,
 * med varje val som en radiogrupp där det nuvarande syns, och lagringen
 * får sin status och sina två knappar bredvid de inställningar den hör
 * ihop med. Valen slår igenom direkt; det finns inget att bekräfta, och
 * därför ingen primär knapp.
 */
const TEMAN = [
  { varde: 'system', etikett: 'Följer systemet' },
  { varde: 'light', etikett: 'Ljust' },
  { varde: 'dark', etikett: 'Mörkt' },
] as const

const TATHETER = [
  { varde: 'kompakt', etikett: 'Kompakt' },
  { varde: 'normal', etikett: 'Normal' },
  { varde: 'luftig', etikett: 'Luftig' },
] as const

const VERKTYGSFALT = [
  { varde: 'rad', etikett: 'Som rad' },
  { varde: 'lodrat', etikett: 'Lodrätt' },
] as const

// Språknamnen står på sitt eget språk och översätts inte: den som letar
// efter engelska ska hitta ordet "English", inte "Engelska".
const SPRAK = [
  { varde: 'sv', etikett: 'Svenska' },
  { varde: 'en', etikett: 'English' },
] as const

export function Installningar(props: {
  onStang: () => void
  onGlomSparat: () => void
  onBorjaOm: () => void
}) {
  const fel = lagringsfel()
  return (
    <Verktygsyta
      yta="dialog"
      titel={t('Inställningar')}
      underrubrik={t('Valen sparas i webbläsaren och slår igenom direkt.')}
      onStang={props.onStang}
      fot={{}}
    >
      <div class="falt">
        <span class="falt__etikett">{t('Tema')}</span>
        <Val
          varden={TEMAN}
          valt={theme.value}
          etikett={t('Tema')}
          onValj={(v) => {
            theme.value = v
          }}
        />
      </div>

      <div class="falt">
        <span class="falt__etikett">{t('Täthet')}</span>
        <Val
          varden={TATHETER}
          valt={tathet.value}
          etikett={t('Täthet')}
          onValj={(v) => {
            tathet.value = v
          }}
        />
        <p class="falt__hjalp">{t('Radhöjden i tabellen. Kompakt visar fler rader på skärmen.')}</p>
      </div>

      <div class="falt">
        <span class="falt__etikett">{t('Verktygsfält')}</span>
        <Val
          varden={VERKTYGSFALT}
          valt={verktygsfalt.value}
          etikett={t('Verktygsfält')}
          onValj={(v) => {
            verktygsfalt.value = v
          }}
        />
        <p class="falt__hjalp">
          {t('Som rad under flikarna, eller lodrätt till vänster om kolumnerna.')}
        </p>
      </div>

      <div class="falt">
        <span class="falt__etikett">{t('Språk')}</span>
        <Val varden={SPRAK} valt={sprak.value} etikett={t('Språk')} onValj={sattSprak} />
        <p class="falt__hjalp">
          {t('Gränssnittets text byter språk. Sortering, tal och datum följer alltid svenska regler.')}
        </p>
      </div>

      <div class="falt">
        <span class="falt__etikett">{t('Lagring')}</span>
        <p class="falt__hjalp">
          {fel ?? t('Öppna filer, profiler och de här valen sparas i din webbläsare. Ingenting lämnar datorn.')}
        </p>
        <div class="knapprad">
          <button class="knapp" onClick={props.onGlomSparat}>
            {t('Glöm sparade filer')}
          </button>
          <button class="knapp knapp--fara" onClick={props.onBorjaOm}>
            {t('Börja om…')}
          </button>
        </div>
      </div>

      <div class="falt">
        <span class="falt__etikett">{t('Om')}</span>
        <p class="falt__hjalp">
          CSV-verkstan {VERSION} · {KANAL === 'beta' ? 'beta' : t('stabil')} ·{' '}
          <a href="./guide/" target="_blank" rel="noopener">
            {t('Användarguiden')}
          </a>
          {KANAL === 'beta' && (
            <>
              {' · '}
              <a href={STABIL_URL}>{t('Stabila utgåvan')}</a>
            </>
          )}
        </p>
      </div>
    </Verktygsyta>
  )
}
