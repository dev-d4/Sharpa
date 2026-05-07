# Rapport — Test-URL:ar

Klistra in efter `localhost:3000` i webbläsaren.

---

## Med belopp + klientnamn (rekommenderat)

### 5 fonder — Tillväxt · 500 000 kr · Erik Andersson
```
/rapport?p=eyJjdXN0b2RpYW4iOiJhdmFuemEiLCJhbW91bnQiOjUwMDAwMCwiY2xpZW50IjoiRXJpayBBbmRlcnNzb24iLCJmdW5kcyI6W3siaXNpbiI6Ik5PMDAxMDgyNzgxOSIsIndlaWdodCI6MzB9LHsiaXNpbiI6IkZJNDAwMDUzMDY0NyIsIndlaWdodCI6MjV9LHsiaXNpbiI6IlNFMDAxNTM4MjExNCIsIndlaWdodCI6MjV9LHsiaXNpbiI6IkxVMDI2MTk0ODkwNCIsIndlaWdodCI6MTB9LHsiaXNpbiI6IkxVMjQzNzQ1MjkyOCIsIndlaWdodCI6MTB9XX0=
```

### 7 fonder — Bred diversifiering · 1 000 000 kr · Maria Lindqvist
```
/rapport?p=eyJjdXN0b2RpYW4iOiJhdmFuemEiLCJhbW91bnQiOjEwMDAwMDAsImNsaWVudCI6Ik1hcmlhIExpbmRxdmlzdCIsImZ1bmRzIjpbeyJpc2luIjoiTk8wMDEzNTgzMzQ0Iiwid2VpZ2h0IjoyNX0seyJpc2luIjoiTk8wMDEwODI3ODE5Iiwid2VpZ2h0IjoxNX0seyJpc2luIjoiRkk0MDAwNTMwNjQ3Iiwid2VpZ2h0IjoxNX0seyJpc2luIjoiU0UwMDAxODM4MDA0Iiwid2VpZ2h0IjoxNX0seyJpc2luIjoiTFUwMjYxOTQ4OTA0Iiwid2VpZ2h0IjoxMH0seyJpc2luIjoiTFUyNDM3NDUyOTI4Iiwid2VpZ2h0IjoxMH0seyJpc2luIjoiU0UwMDAwODEzOTMzIiwid2VpZ2h0IjoxMH1dfQ==
```

### 2 fonder — Enkel 80/20 · 250 000 kr
```
/rapport?p=eyJjdXN0b2RpYW4iOiJhdmFuemEiLCJhbW91bnQiOjI1MDAwMCwiZnVuZHMiOlt7ImlzaW4iOiJTRTAwMTUzODIxMTQiLCJ3ZWlnaHQiOjgwfSx7ImlzaW4iOiJTRTAwMDA4MTM5MzMiLCJ3ZWlnaHQiOjIwfV19
```

---

## Utan belopp (äldre format — fungerar fortfarande)

### 4 fonder — Balanserad
```
/rapport?p=eyJjdXN0b2RpYW4iOiJhdmFuemEiLCJmdW5kcyI6W3siaXNpbiI6IlNFMDAxNTM4MjExNCIsIndlaWdodCI6NTB9LHsiaXNpbiI6IlNFMDAwMTgzODAwNCIsIndlaWdodCI6MjB9LHsiaXNpbiI6IlNFMDAwMDgxMzkzMyIsIndlaWdodCI6MTV9LHsiaXNpbiI6IkxVMjQzNzQ1MjkyOCIsIndlaWdodCI6MTV9XX0=
```

---

## Generera ny URL

```js
const payload = {
  custodian: "avanza",   // "avanza" | "nordnet" | "övrigt"
  amount: 500000,        // valfritt — aktiverar avgiftsräknare och tidssimulator
  client: "Erik Andersson", // valfritt — visas i rubriken
  funds: [
    { isin: "SE0015382114", weight: 60 },
    { isin: "SE0000813933", weight: 40 },
  ],
};
const url = `/rapport?p=${btoa(JSON.stringify(payload))}`;
```
