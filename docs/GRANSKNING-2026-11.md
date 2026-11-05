# Granskning av CSV-verkstan, november 2026

Det här är underlaget för betan: vad som är bra, vad som skaver, vad som saknas, och i vilken ordning
det är värt att ta. Varje punkt som leder till arbete finns också som ett issue i det här repot, samlat
under tre milstolpar. Dokumentet är ögonblicksbilden; issues är det som lever.

Granskningen bygger på läsning av hela `src/`, testerna, guiden och skärmbilderna. Radnummer avser
CSV-Tool `main` vid `86b0967` (15 september 2026).

## Sammanfattning

Verktygen är genomtänkta. Varje städverktyg inventerar först, visar förslaget i tabellen innan något
ändras, räknar vad som händer, och allt går att ångra. Sammanslagningen provar alla kolumnpar och
säger varför den valde, pivoten räknar totaler ur raderna och inte ur cellerna, och sorteringen fryser
ordningen så att en rättad rad inte hoppar iväg. Det här är beteenden som tagit lång tid att få rätt
och som 34 e2e-sviter och 1 090 enhetstester håller på plats. **De ska inte skrivas om.**

Det som skaver är **skalet runt verktygen**:

- `src/ui/App.tsx` är 2 981 rader och äger nästan allt: ~60 handlare, 17 lokala tillstånd, en
  tangentbordshanterare på 200 rader, alla menyer, palettens kopplingar och flikraden.
- Det finns ingen modell för *vilken vy som visas*. Sex fristående på/av-flaggor och en prioritetskedja
  avgör det, och kedjan har redan en bugg.
- Verktygen bor i **tre olika sorters behållare** med tre olika regler för Escape, utan Enter, och med
  knappar som heter olika saker på olika ställen.
- Samma åtgärd är kopplad på fyra ställen (verktygsrad, menyer, inspektör, palett), vilket filen
  `kommandon.ts` själv erkänner i sin huvudkommentar.
- Stilen har färg-tokens men inga tokens för avstånd, textstorlek eller lager; mörkt tema är skrivet
  två gånger, och det finns inte en enda breddregel, så verktyget fungerar bara på en bred skärm.

**Rekommendation: nytt skal, samma kärna.** Ett nytt app-skal med en vy-modell, ett kommandoregister,
en verktygsbehållare och en inställningsdialog, byggt i små steg där varje steg håller alla tester gröna.
`src/core/` rörs inte, verktygens komponenter återanvänds ordagrant, och e2e-testerna anpassas där
etiketter byter plats. En full omskrivning av `src/ui/` hade gett mer frihet men kostat månader av
återbevisning av detaljer som redan är rätt, och den friheten behövs inte: det är inte verktygen som är
problemet.

## 1. Buggar och döda saker

Sådant som är fel idag, oavsett vad som byggs sedan.

| # | Vad | Var |
|---|---|---|
| 1 | **Escape kan stänga en dold vy.** Escape-kedjan prövar Slå ihop före Jämför, renderingen prövar Jämför före Slå ihop. Öppnar man Jämför från paletten medan Slå ihop är öppen visas Jämför, men Escape stänger den dolda Slå ihop först. Kommentaren vid 1766 säger att de två måste ha samma ordning. | `App.tsx:1775–1787` mot `2057–2065`; palettens `slaIhop`/`jamfor` vid 2404 anropar inte `stangEgnaVyer()` |
| 2 | **Ctrl+X annonseras men gör ingenting.** Cellmenyn visar genvägen för *Klipp ut*; tangenthanteraren har inget `x`-fall. | `App.tsx:1278`, `1508–1546` |
| 3 | **Täthet går inte att ändra.** Inställningen sparas, läses och påverkar radhöjden, men ingen meny, dialog eller palettkommando sätter den. | `store.ts:831`, `tokens.css:200` |
| 4 | **F2 betyder två saker.** Menyerna skriver *Byt namn… F2* för kolumner och flikar, men F2 i rutnätet börjar redigera cellen. | `App.tsx:2710`, `2824` |
| 5 | **Fem webbläsardialoger.** Byt namn på kolumn, fyll markering, stäng flik och gå till verkstaden använder `window.prompt`/`confirm`: otematiserade, bara på svenska, och utanför appens egen Escape-logik. | `App.tsx:477, 806, 2089, 2834, 2852` |
| 6 | **Ej översatt trots README-löftet.** Toasten efter Tillämpa, toasts i Slå ihop, Kombinera och Verkstaden, stegnamnen i `kor()`, kolumnnamnet `Källa` i Kombinera. Enhetstestet för ordboken ser bara det som går genom `t()`. | `App.tsx:2276`, `SlaIhop.tsx:295`, `Kombinera.tsx:224–239`, `Verkstad.tsx:147–243` |
| 7 | **Escape stänger panelen från en rullgardin.** `Verktygspanel` undantar bara `INPUT`; Escape i en `<select>` i Sortera eller Filter stänger hela panelen. `Modal` stänger alltid, även mitt i ett fält. | `Verktygspanel.tsx:25`, `parts.tsx:17` |
| 8 | **Dialogerna saknar fokusfälla** och lämnar inte tillbaka fokus när de stängs. | `parts.tsx:6–39` |
| 9 | **Pivotplaner försvinner vid omladdning**, trots att flikarna i övrigt överlever. | `state/pivot.ts:22` |
| 10 | **Profil tas bort utan fråga och utan ångra.** | `ProfilDialog.tsx:197` |
| 11 | Oanvänd CSS (`.verktygsrad__avdelare`), gissad menyposition i statusraden (`r.top - 150`), döda grid-mallar för `.arbetsyta` utan inspektör. | `base.css:325`, `Statusrad.tsx:192`, `base.css:439–456` |

## 2. Skalet och navigeringen

### 2.1 En vy-modell i stället för sex flaggor

`pivotOppen`, `slaIhopOppen`, `jamforOppen`, `kombineraOppen`, `verkstadOppen` och App-lokala
`oversiktOppen` kan alla vara sanna samtidigt. Renderingen väljer den första i en kedja, Escape en
annan kedja, och `egenVy` räknas ut för hand för att gömma statusrad och verktygsfält. Ersätts med en
signal `vylage` av typen `{ typ: 'rutnat' | 'oversikt' | 'pivot' | 'verkstad' | 'slaihop' | 'kombinera' | 'jamfor' }`
där `oppnaVy` alltid ersätter och `stangVy` alltid går till rutnätet. Bugg 1 försvinner per konstruktion.

### 2.2 Ett kommandoregister

Idag: verktygsraden anropar App, menyerna byggs i App, inspektören får callbacks från App, paletten får
ett objekt med 43 callbacks från App, och genvägarna ligger i en egen `switch`. Ett verktyg som får ett
nytt kommando måste kopplas på fyra ställen och får lätt olika etikett på två av dem.

Ett register med ett kommando per åtgärd: id, etikett, grupp, genväg, ikon, *när* det är tillgängligt
(och varför inte), och vad det gör. Verktygsrad, menyer, inspektör, palett och genvägar läser alla samma
lista. Palettens sökning, menyernas avstängda poster med skäl och genvägarnas visningstext kommer då
gratis och lika överallt.

### 2.3 En verktygsbehållare

Tre sorter idag:

| Behållare | Används av | Escape | Enter | Fot |
|---|---|---|---|---|
| Sidopanel `Verktygspanel` | Datum, Tal, Telefon, E-post, Dela, Dela till rader, Mall, Räkna, Ersätt, Sortera, Filter, Dubbletter | stänger, utom i `INPUT` | inget | olika |
| `Modal` | Importera, Exportera, Gruppera, Profiler, Börja om, Klistra in | stänger alltid | inget | olika |
| Helskärmsvy | Slå ihop, Kombinera, Jämför, Pivot, Verkstaden, Översikt | via App-kedjan | inget | egen per vy |

Fötterna säger idag: *Avbryt/Tillämpa*, *Avbryt/Skapa kolumnen*, *Stäng/Ta bort 3 rader*,
*Ta bort alla regler/Klar*, *Ta bort sorteringen/Klar*, *Stäng* som primär (Profiler), *Stäng pivoten* som
primär medan *Gör till ny flik* är sekundär, och Verkstaden har två primärknappar synliga samtidigt
(*Para ihop* och *Slå ihop*).

Förslag: **en** behållare, `Verktygsyta`, som vet om den är panel, vy eller dialog, och en fot med fast
form: *primär* (Enter), *sekundär* (Escape, alltid *Avbryt* i panel och dialog, *Stäng* i vy), och en
valfri *destruktiv* knapp längst till vänster som alltid är röd och aldrig tangentbunden. Primärknappen
säger vad som händer med ett verb och ett tal: *Skriv om 10 celler*, *Skapa kolumnen*, *Ta bort 3 rader*,
*Skapa fliken*. Fokus går till första fältet när ytan öppnas (rubriken för paneler, så att rutnätets
markering står kvar) och tillbaka till rutnätet när den stängs. Enter tillämpar när fokus inte är i en
textarea, rullgardin eller meny. Escape i ett fält lämnar fältet först, nästa Escape stänger.

### 2.4 App.tsx delas

Rena flyttar till `src/ui/skal/`: filöppning, urklipp, handlare, flikrad, högerpanel, dialoger,
innehållsväljare, verktygsrad, tangentbord och menyer. Kvar i `Skal.tsx` är layouten, under 300 rader.

### 2.5 Inställningar

Kugghjulet rymmer två val. En dialog i stället, nådd med `Ctrl+,` och från paletten: tema (följ systemet,
ljust, mörkt), täthet (bugg 3 får sitt UI), verktygsfält (rad eller lodrätt), språk, lagring (status,
*Glöm sparade filer*, *Börja om…*) och *Om* med version och kanal. Sol/måne-knappen och kugghjulet
försvinner; språkväljaren står kvar i app-raden eftersom den är det första en engelsktalande letar efter.

### 2.6 Tokens, tema och bredd

- Tokens för avstånd (`--mellanrum-1…6`), textstorlek (`--text-xs…lg`) och lager (`--z-meny`,
  `--z-overlagg`, `--z-palett`, `--z-toast`). Idag ~260 hårdkodade px och tio olika textstorlekar.
- Mörk palett en gång med `light-dark()` och `color-scheme`, i stället för två identiska block.
- Breddregler: under ~1100 px blir kolumnpanelen och högerpanelen lådor som skjuts in över rutnätet;
  under ~720 px blir verktygsraden en rad som rullar. Rutnätet själv är redan virtualiserat och klarar det.

## 3. Verktygen, ett i taget

Det som är gemensamt (fot, Enter/Escape, fokus) står under 2.3 och upprepas inte här.

**Datum** är förebilden: inventering, bevis i kolumnen, fråga bara när det behövs, nytt-kolumn-val,
felhantering, resultat med filter. Det enda som skaver är att resultatblocket är en handkopia av
`Resultat` i stället för komponenten.

**Tal** och **Telefon** saknar *Lägg resultatet i en ny kolumn*, som Datum har. `1 240,50 kr` → `1240.50`
är precis ett fall där man vill ha båda kvar. `FELTILLSTAND` är definierat tre gånger med olika
hjälptexter; en gång räcker.

**E-post → namn** har egna filterknappar (*Alla rader*, *Bara tomma*) där övriga har *Bara ändrade*
och *Bara problem*. Samma komponent, samma ord.

**Dela kolumnen** saknar inventeringstabellen trots att `inventeraDelning` och `inventeraMonster` finns i
kärnan och redan räknar det som behövs. Fälten för mönster, position och kolumnnamn saknar
tillgängliga namn.

**Dela till rader** rensar förhandsvisningen och visar en egen före/efter-tabell. Det är rätt (radantalet
ändras), men tabellen borde se ut som förhandsvisningen i Gruppera, så att de två *nya fliken*-verktygen
känns som ett.

**Bygg kolumn ur mall** och **Räkna** har ingen *Bara problem*-knapp fast de räknar celler som blir tomma.
Räknas underrubrik är den *nya* kolumnens namn medan alla andra visar källkolumnen.

**Sök och ersätt** saknar inventering (hur många celler matchar innan man skriver något) och
*Lägg i ny kolumn*. Sök-fältet saknar tillgängligt namn.

**Snabbstädning** (trimma, dubbla mellanslag, osynliga tecken, VERSALER…) körs direkt med en toast.
Samma förhandsvisningsmotor som de andra verktygen använder kan visa före → efter för de här också, med
*Bara ändrade*; det är tre rader kod bort och tar bort den enda åtgärden i verktyget som ändrar data
utan att visa resultatet först.

**Sortera** och **Filter** gör rätt i att verka direkt, men foten ska följa mönstret: *Stäng* som sekundär,
*Ta bort sorteringen*/*Ta bort alla regler* som destruktiv till vänster. Filtrets *är något av* behöver
*markera alla*/*inga* i värdelistan. Filterraden ovanför tabellen är bra och ska vara kvar.

**Dubbletter**: *Stäng* → *Avbryt*; *Ta bort 3 rader* förblir röd primär eftersom det är verktygets
poäng, men först när ett val är gjort.

**Gruppera och summera** är en modal med en egen förhandsvisningstabell. Som panel med förhandsvisningen
i rutnätet (en spökflik ritad som rutnät, som Pivotunderlag redan gör) blir den ett verktyg bland de andra
i stället för ett undantag. Grupperingen ska också kunna ingå i profiler; idag står det att den inte gör det.

**Slå ihop** visar upp till tio kontrollgrupper och fyra rutor på en gång. En stegindikator
(1 Filer · 2 Nyckel · 3 Kolumner · 4 Resultat) där inställningarna fälls ihop till en rad när de är klara
ger samma information i ordning. Texten *hittar ingen kund* antar kunddata. Verkstaden ska ha en väg
tillbaka till Slå ihop med samma inställningar.

**Verkstaden**: en primärknapp i taget (*Para ihop* när två rader är valda, annars *Slå ihop*), sök i
restlistorna, och virtualisering i stället för gränsen på 200 rader.

**Kombinera** och **Jämför** saknar det tomma läget med släppyta som Slå ihop har, och knappen heter
*Lägg till par* på ett ställe och *Lägg till kolumnpar* på ett annat.

**Pivot**: *Gör till ny flik* primär, *Stäng* sekundär; upp till sju notiser i foten samlas till en;
planen sparas per flik. Diagrammet saknas helt i guiden.

**Importera**: bra. Visa radantal och kolumnantal överst, inte bara i förhandsvisningen.
**Exportera**: xlsx saknar förhandsvisning; en rad per kolumn med typ (tal/text/datum) säger vad Excel
kommer att få.

**Profiler**: borttagning med fråga; *Stäng* ska inte vara primär.

## 4. Saknas

Bekräftat genom läsning av koden:

- **Responsiv layout.** Inga breddregler alls.
- **Installerbar och offline.** Verktyget lovar att inget lämnar maskinen; ett manifest och en service
  worker gör att det också kan öppnas utan nät, från hemskärmen. Säkerhetspolicyn tillåter redan
  `worker-src 'self'`.
- **Kortkommandoöversikt** på `?`, byggd ur kommandoregistret så att den aldrig ljuger.
- **Ctrl+X**, **täthetsval**, **pivotplaner över omladdning**, **fokusfälla**, **tillgängliga fältnamn**
  (se §1).
- **Gruppering i profiler** och **Diagram i guiden**.
- **Tester**: Import-dialogens val av avgränsare och teckenkodning, exportalternativen, *Ta bort alla
  regler*, *Exportera restlistorna*, *Öppna profilfil*, Telefon (ett test), Jämför (tre), Dela till rader (två).

Kandidater att undersöka innan de blir issues:

- **Avpivotera** (bred → lång): tolv månadskolumner till rader med *Månad* och *Belopp*. Pivoten går åt ena
  hållet; det här är det andra, och behovet dyker upp i varje ekonomifil.
- **Frysta kolumner** i rutnätet (radnumret är redan fryst; en nyckelkolumn borde kunna vara det).
- **Fyll tomma celler** med ett värde eller värdet ovanför.
- **Radmarkering** via kryss i radnummerkolumnen, för att ta bort eller färga spridda rader.
- **Kopiera som Markdown-tabell** och **export till JSON**.
- **Sök och ersätt över hela tabellen**, inte bara valda kolumner.
- **Flikar att dra om**.

## 5. Roadmap

Tre milstolpar. Varje punkt är ett issue med etikett `gui`, `ux`, `verktyg`, `saknas`, `bugg` eller `test`.

### 0.2 Nytt skal

I ordning, en PR per steg, alla tester gröna efter varje:

1. Beta-identitet: kanal, version, lagringsprefix, märke, CI (denna PR).
2. Vy-modell `vylage` ersätter sex flaggor. Löser bugg 1. (#1)
3. Tokens för avstånd, text och lager; mörk palett en gång. (#2)
4. `Verktygsyta` med fot, Enter/Escape och fokus; verktygen portas ett i taget. (#3)
5. Kommandoregister; palett, menyer, verktygsrad, inspektör och genvägar kopplas om. Löser bugg 2. (#4)
6. `App.tsx` delas i skal-moduler. (#5)
7. Inställningsdialog. Löser bugg 3. (#6)
8. Appegna bekräftelser ersätter `window.prompt`/`confirm`. Löser bugg 5. (#7)

### 0.3 Verktygsputs

Responsiv layout (#8), px-svep mot tokens (#9), tillgängliga fältnamn (#10), översättning av det som
inte går genom `t()`, bugg 6 (#11), ny kolumn i Tal/Telefon/Ersätt (#12), inventeringstabeller (#13),
en `Resultat` (#14), snabbstädning med förhandsvisning (#15), Gruppera som panel och i profiler (#16),
Slå ihop med stegindikator (#17), Verkstaden (#18), Kombinera och Jämför (#19), Pivot (#20),
Filter/Dubbletter/Profiler (#21), Export och Import (#22).

### 0.4 Saknade funktioner

Installerbar och offline (#23), kortkommandoöversikt (#24), pivotplaner (#25), avpivotera (#26),
frysta kolumner (#27), mindre kandidater (#28, #29), testluckorna (#30).

## Bilaga: siffror

| | |
|---|---|
| Rader i `src/` | 16 500 |
| Rader i `src/ui/App.tsx` | 2 981 |
| Verktygskomponenter | 12 paneler, 6 dialoger, 6 helskärmsvyer |
| Enhetstester | 40 filer, 1 090 tester |
| e2e-sviter | 34 filer |
| Hårdkodade px i CSS | ~260 |
| Breddregler (`@media`) | 0 |
| `window.prompt`/`confirm` | 5 |
