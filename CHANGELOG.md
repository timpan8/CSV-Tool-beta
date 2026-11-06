# Ändringslogg

Formatet följer [Keep a Changelog](https://keepachangelog.com/sv/1.1.0/). Versionerna följer
[semantisk versionering](https://semver.org/lang/sv/): `0.2.0-beta.N` i det här repot, `0.2.0` när
samma kod gått till [CSV-Tool](https://github.com/timpan8/CSV-Tool).

## [Ej släppt]

### Tillagt
- `Ctrl+X` klipper ut markeringen och `Ctrl+A` markerar allt. Båda står i cellmenyn och i paletten, och
  genvägarna där kommer nu ur samma lista som tangentbordet lyssnar på. Gör om går också med `Ctrl+Skift+Z`.

### Ändrat
- Verktygen bor i en och samma behållare, med en fast fot: primär knapp till höger (Enter), *Avbryt*
  eller *Stäng* bredvid (Escape), och en röd knapp längst till vänster för det som tar bort. Enter
  tillämpar när du står i ett fält i panelen; Escape lämnar fältet först och stänger sedan. En dialog
  tar fokus till sitt första fält och lämnar tillbaka det när den stängs.
- Sortera och Filter stängs med *Stäng* i stället för *Klar*; Dubbletter avbryts med *Avbryt*.
  Profilernas *Stäng* är inte längre en primärknapp.

## [0.2.0-beta.1] – 2026-11-05

Första betan. Samma kod som CSV-Tool 0.1.0 plus beta-identiteten.

### Tillagt
- Beta-märke i app-raden med versionsnummer och länk till den stabila utgåvan.
- `docs/GRANSKNING-2026-11.md`: genomgång av vad som saknas och vad som kan bli bättre, med roadmap.
- `docs/UTVECKLING.md`: hur beta och stable hänger ihop.

### Ändrat
- Kanalen (`beta`/`stabil`) är en byggflagga, `VITE_KANAL`, läst i `src/version.ts`. Betan sparar under
  egna nycklar (`csv-verkstan-beta.*`, IndexedDB `csv-verkstan-beta`) så att den aldrig rör den stabila
  utgåvans sparade flikar, profiler och inställningar.
- Dokumenttiteln är `CSV-verkstan beta` i betan.

[Ej släppt]: https://github.com/timpan8/CSV-Tool-beta/compare/v0.2.0-beta.1...HEAD
[0.2.0-beta.1]: https://github.com/timpan8/CSV-Tool-beta/releases/tag/v0.2.0-beta.1
