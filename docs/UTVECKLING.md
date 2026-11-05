# Utveckling: beta och stable

Det finns två repon med samma kod.

| | Repo | Publiceras på | Sparar under |
|---|---|---|---|
| **Stable** | [timpan8/CSV-Tool](https://github.com/timpan8/CSV-Tool) | https://timpan8.github.io/CSV-Tool/ | `csv-verkstan` |
| **Beta** | [timpan8/CSV-Tool-beta](https://github.com/timpan8/CSV-Tool-beta) | https://timpan8.github.io/CSV-Tool-beta/ | `csv-verkstan-beta` |

Allt nytt byggs i betan. Stable får bara det som visat sig hålla.

## Kanalen är en byggflagga

Betan är inte en gren som glider isär från stable, utan **samma kod byggd med `VITE_KANAL=beta`**.
Flaggan sätts i beta-repots CI (`.github/workflows/deploy.yml`) och läses på ett enda ställe, `src/version.ts`,
som ger tre saker: märket i app-raden, dokumenttiteln och lagringsprefixet. Stable bygger utan flaggan och
behöver därför inga ändringar när kod flyttas tillbaka.

De två utgåvorna ligger på samma ursprung (`timpan8.github.io`) och hade utan egna nycklar skrivit över
varandras sparade flikar. Därför har betan egna localStorage-nycklar och en egen IndexedDB. Profilfiler
(`csv-verkstan-profil`) är ett filformat, inte en lagringsplats, och går att öppna i båda.

Lokalt:

```sh
VITE_KANAL=beta npm run dev      # betan, med märke och egna nycklar
npm run dev                      # samma kod som stable
VITE_KANAL=beta npm run test:e2e # röktestet mot beta-bygget, som i CI
```

## Arbetsflöde i betan

- `main` är integrationsgrenen och publiceras automatiskt som beta vid varje push.
- Allt arbete sker på funktionsgrenar och går in via pull request. CI kör typkontroll, enhetstester,
  bygge och röktest på varje PR.
- Varje PR som märks i gränssnittet får en rad under *Ej släppt* i `CHANGELOG.md`.
- Versionen i `package.json` är `0.2.0-beta.N`. `N` höjs när en ny beta taggas: `v0.2.0-beta.2` och så vidare.

## Release till stable

Två fristående repon kan inte ha pull requests mellan sig, så releasen går via en gren i stable:

```sh
# i en klon av beta-repot, med stable som extra remote
git remote add stable https://github.com/timpan8/CSV-Tool
git fetch stable main
git checkout -b release/0.2.0 main
# flytta "Ej släppt" till "0.2.0" i CHANGELOG.md, sätt version 0.2.0 i package.json
git push -u stable release/0.2.0
```

Öppna sedan en PR i CSV-Tool från `release/0.2.0` mot `main`. När den gått in: tagga `v0.2.0` i stable,
hämta tillbaka `stable/main` till betans `main` och sätt nästa version, `0.3.0-beta.1`.

Nästa beta börjar alltid från det som just blev stable, så de två kan aldrig glida isär mer än en version.

## Vad som inte ändras

- `src/core/` är ren logik utan DOM och rörs inte av skal-omgörningen.
- Säkerhetspolicyn (`connect-src 'none'`) är densamma i båda utgåvorna, och `smoke.spec.ts` faller om
  appen någonsin gör ett nätverksanrop.
