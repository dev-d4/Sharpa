# Backlog

Lägre siffra = högre prioritet. När du ber Claude läsa igenom denna fil kommer de punkter med lägst siffra att utvecklas först.

## Format
```
[prio] Titel
       Beskrivning (valfritt)
```

---

## Funktioner

[1] När man lägger till två av samma fonder i portföljen så blir det error. hur kan man förbättra detta på bästa sett? jag föreslår att den tas bort från utbudet för närvarande om man lagt till en fond.

[3] Samlad riskmatchning för alla portföljer
    Visa hur alla portföljer tillsammans matchar mot riskprofilen. Kräver att man lagrar
    totalt portföljvärde (kr) per portfölj för att kunna kapitalvikta sammanvägningen korrekt —
    annars måste man anta lika vikt per portfölj vilket kan ge missvisande resultat.
    Steg: (1) Lägg till valfritt fält `total_value` i portfolios-tabellen, (2) låt användaren
    ange värde vid sparande, (3) beräkna viktad genomsnittlig risknivå och visa mot profilen
    i "Din riskprofil"-sektionen på kontosidan.


<!-- Exempel:
[1] Notiser när en fond presterar dåligt
    Skicka e-post eller push-notis om en fond i portföljen tappar mer än X% på en månad.

[2] Jämför två portföljer
    Lägg in två portföljer och se nyckeltal sida vid sida.

[3] Historisk prestandavy
    Graf som visar portföljens viktade avkastning över tid.
-->


