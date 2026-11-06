import type { ColumnId } from '../../core/types.js'
import { fargToken } from '../../core/frame/farg.js'
import { STADNINGAR } from '../../core/ops/clean.js'
import type { Riktning } from '../../core/ops/sort.js'
import { theme, verktygsfalt } from '../../state/store.js'
import type { Sessionslage } from '../../state/matchning.js'
import { FARGER, fargetikett } from '../fargetikett.js'
import type { MenyPost } from '../parts.jsx'
import { t, tf } from '../sprak.js'

/*
 * Menyerna som inte behöver skalets tillstånd: de får sina handlingar som
 * argument och bygger posterna. Menyerna som läser rutnätets läge bor i
 * `menyposter.ts`.
 */

export function stadMeny(
  stada: (id: string) => void,
  rader: { tommaRader: () => void; tommaKolumner: () => void },
): (MenyPost | 'avdelare')[] {
  return [
    ...STADNINGAR.map((s): MenyPost => ({
      etikett: t(s.etikett),
      kor: () => stada(s.id),
    })),
    'avdelare',
    { etikett: t('Ta bort helt tomma rader'), kor: rader.tommaRader },
    { etikett: t('Ta bort helt tomma kolumner'), kor: rader.tommaKolumner },
  ]
}

/**
 * De tre sätten att sätta ihop flera filer.
 *
 * De låg tidigare som två knappar i verktygsraden — *Slå ihop* och
 * *Kombinera* — två ord för nästan samma sak och omöjliga att skilja åt utan
 * att prova. Här står de under varandra med en rad som säger vad som händer
 * med raderna, och mallen får en egen ingång i stället för att gömma sig i en
 * väljare inne i kombineringsvyn.
 */
export function flerfilsmeny(handlers: {
  slaIhop: () => void
  jamfor: () => void
  kombinera: () => void
  mall: () => void
  session: Sessionslage
  aterta: () => void
}): (MenyPost | 'avdelare')[] {
  return [
    {
      etikett: t('Slå ihop…'),
      skal: t('rader som hör ihop läggs sida vid sida, matchat på en nyckel'),
      kor: handlers.slaIhop,
    },
    {
      etikett: t('Jämför…'),
      skal: t('två kolumner mot varandra: vad är lika, vad skiljer sig, vad saknas'),
      kor: handlers.jamfor,
    },
    {
      etikett: t('Kombinera…'),
      skal: t('filerna läggs på varandra, kolumner som betyder samma sak i samma spalt'),
      kor: handlers.kombinera,
    },
    {
      etikett: t('Fyll en mall med data…'),
      skal: t('en fil med bara rubriker bestämmer formen, data hämtas ur de filer du väljer'),
      kor: handlers.mall,
    },
    'avdelare',
    {
      etikett: t('Fortsätt beta av resten…'),
      /*
       * Filnamnen och inte antalet kvar. Att räkna fram antalet kräver en hel
       * grundmatchning över båda filerna — `byggNycklar` normaliserar varje
       * kolumns hela ordbok, och det gäller även med urval — och det är inte
       * ett svep man lägger i vägen för en nedfälld meny. Siffran står inne i
       * verkstaden, där man ändå ska titta.
       *
       * Tre lägen och inte två: att ingen session finns och att sessionens fil
       * är stängd är olika saker, och det andra kostar användaren arbete.
       */
      skal: handlers.session.lage === 'ingen' ? undefined : handlers.session.namn,
      inaktiv:
        handlers.session.lage === 'ingen'
          ? t('Ingen påbörjad sammanslagning att gå tillbaka till.')
          : handlers.session.lage === 'stangd'
            ? tf(
                'Filerna är stängda, så det finns inga rader att beta av. {0} beslut gick förlorade med dem — en fil som öppnas igen är en ny fil för verktyget, så besluten går inte att återansluta.',
                handlers.session.ogjort,
              )
            : undefined,
      kor: handlers.aterta,
    },
  ]
}

/**
 * Färgmenyn: paletten som poster, med en ruta i färgen före namnet, och
 * *Ta bort färg* sist. `aktiv` markerar den färg som gäller nu, där det
 * finns en — kolumnfärgen har en, en markering har många.
 */
export function fargmeny(valj: (farg: number) => void, aktiv?: number): (MenyPost | 'avdelare')[] {
  return [
    ...FARGER.map(
      (f): MenyPost => ({
        etikett: fargetikett(f.farg),
        farg: fargToken(f.farg),
        ...(aktiv !== undefined ? { aktiv: aktiv === f.farg } : {}),
        kor: () => valj(f.farg),
      }),
    ),
    'avdelare',
    { etikett: t('Ta bort färg'), kor: () => valj(0) },
  ]
}

export function radMeny(handlers: {
  infogaFore: () => void
  infogaEfter: () => void
  duplicera: () => void
  farga: (farg: number) => void
  taBort: () => void
}): (MenyPost | 'avdelare')[] {
  return [
    { etikett: t('Infoga rad ovanför'), kor: handlers.infogaFore },
    { etikett: t('Infoga rad nedanför'), kor: handlers.infogaEfter },
    { etikett: t('Dubblera markerade rader'), kor: handlers.duplicera },
    { etikett: t('Färga raden'), undermeny: fargmeny(handlers.farga) },
    'avdelare',
    { etikett: t('Ta bort markerade rader'), fara: true, kor: handlers.taBort },
  ]
}

export function kolumnMeny(
  id: ColumnId,
  handlers: {
    dopOm: (id: ColumnId) => void
    duplicera: (id: ColumnId) => void
    vaxlaDold: (id: ColumnId) => void
    infogaFore: (id: ColumnId) => void
    infogaEfter: (id: ColumnId) => void
    lopnummer: () => void
    flyttaForst: (id: ColumnId) => void
    flyttaSist: (id: ColumnId) => void
    anpassaBredd: (id: ColumnId) => void
    kolumnfarg: (id: ColumnId, farg: number) => void
    fargaAlla: (id: ColumnId, farg: number) => void
    /** Kolumnens nuvarande etikettfärg, 0 för ingen. */
    farg: number
    visaOgiltiga: (id: ColumnId) => void
    /** Verktygen, färdigsorterade efter vad kolumnen innehåller. */
    verktyg: (MenyPost | 'avdelare')[]
    filtrera: (id: ColumnId) => void
    /** Kolumnens namn, för de poster som nämner den. */
    namn: string
    sammanfatta: (id: ColumnId) => void
    sortera: (id: ColumnId, riktning: Riktning) => void
    laggSortering: (id: ColumnId) => void
    /** Öppnar sorteringspanelen — vägen till flera nivåer och färg. */
    sorteraFlera: (id: ColumnId) => void
    sortriktning: Riktning | null
    taBort: (id: ColumnId) => void
    dold: boolean
    /**
     * Regelposterna, när kolumnen är byggd ur en mall. Tom lista annars.
     *
     * De ligger i kolumnmenyn och inte i cellmenyn: en mall hör till
     * kolumnen, och cellmenyn är kortare med flit.
     */
    regel: (MenyPost | 'avdelare')[]
  },
): (MenyPost | 'avdelare')[] {
  return [
    { etikett: t('Byt namn…'), genvag: 'F2', kor: () => handlers.dopOm(id) },
    { etikett: t('Duplicera kolumnen'), kor: () => handlers.duplicera(id) },
    {
      etikett: t(handlers.dold ? 'Visa kolumnen' : 'Dölj kolumnen'),
      kor: () => handlers.vaxlaDold(id),
    },
    'avdelare',
    { etikett: t('Infoga tom kolumn till vänster'), kor: () => handlers.infogaFore(id) },
    { etikett: t('Infoga tom kolumn till höger'), kor: () => handlers.infogaEfter(id) },
    {
      etikett: t('Lägg till kolumn med löpnummer'),
      skal: t('1, 2, 3 … först i filen, i radernas nuvarande ordning'),
      kor: () => handlers.lopnummer(),
    },
    'avdelare',
    { etikett: t('Flytta först'), kor: () => handlers.flyttaForst(id) },
    { etikett: t('Flytta sist'), kor: () => handlers.flyttaSist(id) },
    { etikett: t('Anpassa bredden efter innehållet'), kor: () => handlers.anpassaBredd(id) },
    {
      /*
       * En post och inte två, för menyn är redan hög: en rad till och
       * undermenyerna når under fönsterkanten på en vanlig skärm. Färgen
       * på rubriken är det man oftast vill ha; att färga alla celler ligger
       * ett steg in.
       */
      etikett: t('Kolumnfärg'),
      skal: t('en etikett på rubriken, för att hitta kolumnen'),
      undermeny: [
        ...fargmeny((f) => handlers.kolumnfarg(id, f), handlers.farg),
        'avdelare',
        {
          etikett: t('Färga alla celler'),
          undermeny: fargmeny((f) => handlers.fargaAlla(id, f)),
        },
      ],
    },
    'avdelare',
    {
      /*
       * Sorteringen som en undermeny. Menyn nådde under fönsterkanten på en
       * vanlig skärm när kolumnfärgen kom till, och tre poster om samma sak
       * är en grupp — de fick bli den.
       */
      etikett: t('Sortera'),
      skal:
        handlers.sortriktning === 'stigande'
          ? 'A→Ö'
          : handlers.sortriktning === 'fallande'
            ? 'Ö→A'
            : undefined,
      undermeny: [
        {
          etikett: t('Sortera A→Ö'),
          aktiv: handlers.sortriktning === 'stigande',
          kor: () => handlers.sortera(id, 'stigande'),
        },
        {
          etikett: t('Sortera Ö→A'),
          aktiv: handlers.sortriktning === 'fallande',
          kor: () => handlers.sortera(id, 'fallande'),
        },
        { etikett: t('Lägg till som sorteringsnivå'), kor: () => handlers.laggSortering(id) },
        'avdelare',
        {
          etikett: t('Sortera på flera kolumner…'),
          skal: t('nivåer i prioritetsordning, värde eller färg'),
          kor: () => handlers.sorteraFlera(id),
        },
      ],
    },
    'avdelare',
    { etikett: t('Filtrera på kolumnen…'), kor: () => handlers.filtrera(id) },
    {
      etikett: tf('Gruppera på {0}…', handlers.namn),
      skal: t('en rad per värde, med summa och antal för resten av kolumnerna'),
      kor: () => handlers.sammanfatta(id),
    },
    { etikett: t('Visa rader som inte går att tolka'), kor: () => handlers.visaOgiltiga(id) },
    'avdelare',
    ...handlers.verktyg,
    ...handlers.regel,
    'avdelare',
    { etikett: t('Ta bort kolumnen'), fara: true, kor: () => handlers.taBort(id) },
  ]
}

/*
 * Inställningsmenyn. Tema finns här av ett skäl som sol/måne-knappen inte
 * löser: den växlar bara ljust ↔ mörkt och kan aldrig återgå till *följer
 * systemet*, fast det värdet finns. Språket står inte här — det ska synas i
 * hörnet, det var hela poängen med att flytta det dit.
 */
export const installningsmeny = (): (MenyPost | 'avdelare')[] => [
  {
    etikett: t('Verktygsfält: som rad'),
    aktiv: verktygsfalt.value === 'rad',
    kor: () => {
      verktygsfalt.value = 'rad'
    },
  },
  {
    etikett: t('Verktygsfält: lodrätt'),
    aktiv: verktygsfalt.value === 'lodrat',
    kor: () => {
      verktygsfalt.value = 'lodrat'
    },
  },
  'avdelare',
  {
    etikett: t('Tema: följer systemet'),
    aktiv: theme.value === 'system',
    kor: () => {
      theme.value = 'system'
    },
  },
  {
    etikett: t('Tema: ljust'),
    aktiv: theme.value === 'light',
    kor: () => {
      theme.value = 'light'
    },
  },
  {
    etikett: t('Tema: mörkt'),
    aktiv: theme.value === 'dark',
    kor: () => {
      theme.value = 'dark'
    },
  },
]
