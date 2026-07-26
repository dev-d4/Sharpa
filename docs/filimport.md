# Filimport av innehav

Analysverktyget (`/analyze`) läser in en portfölj från fil. Parsern:
[`lib/portfolio-import.ts`](../lib/portfolio-import.ts).

## Krav på filen

* **Format:** `.csv`, `.txt` (semikolon, tab eller komma) eller `.xlsx`. Inte `.xls`.
* **Rad 1 = rubrikrad.** Kolumner matchas på namn, inte position.
* **Två kolumner krävs:**

| Kolumn | Godkända rubriker |
| --- | --- |
| Namn | `Namn`, `Name`, `Värdepapper`, `Instrument`, `Fond`, `Innehav`, `Fondnamn` |
| Värde | `Marknadsvärde`, `Värde (SEK)`, `Värde SEK`, `Värde`, `Belopp` — eller `Andel (%)` / `Vikt` |

* **Frivilligt:** `ISIN` (ger exakt matchning i stället för namnsökning), `Typ` (aktier,
  ETF:er och certifikat sorteras bort), `Kontonummer`.

Exporter från Avanza (`Positioner.csv`) och Nordnet fungerar direkt.

## Så tolkas innehållet

* Belopp i svenskt format: `12 345,60`. `kr`, `SEK` och `%` ignoreras.
* Vikter räknas alltid om till 100 %, en decimal.
* Rader utan namn eller med värde ≤ 0 hoppas över.
* Endast fonder importeras. `avanza_fund_data` och `nordnet_fund_data` innehåller inga
  ETF:er (verifierat: 0 av 1529 resp. 0 av 1709), så börshandlade fonder filtreras bort
  tillsammans med aktier och certifikat i stället för att gå till matchning och falla ut
  som "kunde inte läsas in".
* Samma ISIN på flera konton slås ihop.
* Max 50 innehav — de minsta utelämnas.
* `GAV`, `inköp`, `anskaffning`, `belån`, `kurs`, `utveckling`, `avkastning` väljs
  aldrig som värdekolumn.
* Teckenkodning: UTF-8, UTF-16 eller Windows-1252 (auto).

## Matchning

Varje innehav slås upp mot `/api/funds/search`: exakt ISIN → exakt namn → första
namnträffen. Omatchade innehav behåller namn och vikt men saknar ISIN, och listas i
en popup efter importen så att användaren kan söka upp dem manuellt.

## Felkoder

`unsupported-format` · `empty` · `no-columns` (listar hittade rubriker) · `no-rows` ·
`only-non-funds`. Alla visas som text i importdialogen.
