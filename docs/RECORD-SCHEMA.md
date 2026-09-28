# Scheda della biografia

**Versione 1**
Biography Library, Lugano. 28 settembre 2026, Anno 0 UM.

Questa scheda non è il racconto. Il racconto è libero e sta nel testo. La scheda è l’elenco fisso dei fatti che la piattaforma conosce già: chi è la persona, quando è nata, dove ha vissuto, con che licenza il testo è pubblicato. Serve a chi, fra molto tempo, trova il pacchetto e deve capire di quale vita si tratta senza leggere tutto il libro.

Le versioni successive possono aggiungere righe in fondo. Non possono cambiare l’ordine delle righe di questa versione, né dare a una riga un nome nuovo.

## Come si legge

Ogni riga ha un nome e un valore. Se un fatto non si conosce, il valore è `UNKNOWN` (o, nella lingua della scheda, la parola locale seguita da `UNKNOWN`). La riga non si toglie. Una scheda con molti valori ignoti è valida. Una scheda a cui manca una riga non lo è.

Il luogo è sempre di sei parti, separate da una barra verticale, anche quando non si conosce:

nome | latitudine | longitudine | WGS 84 | geonames | wikidata

Se il nome o un numero manca, al suo posto c’è `UNKNOWN`. Il datum è sempre WGS 84. Non si scrive una sola parola al posto di tutta la riga.

## Ordine delle righe

1. La riga `BIOGRAPHY LIBRARY`.
2. Identificativo UM.
3. Indirizzo con cui, il giorno della pubblicazione, si poteva aprire quella scheda. Se non c’è, `UNKNOWN`. Quell’indirizzo non fa parte dell’identificativo e può spegnersi.
4. Nota che lo dice.
5. Versione di questa scheda. Qui è `1`.
6. Lingua: nome della lingua, codice, scrittura, direzione (da sinistra a destra o il contrario).
7. Nome come è stato scritto.
8. Nome in lettere latine, se serve.
9. Nascita: nome dell’evento, data, data come è stata detta, giorno giuliano, luogo, fonte.
10. Morte: le stesse sei righe. In un’autobiografia di una persona viva restano, con valore ignoto.
11. Luoghi di vita: almeno una riga. Se non ce ne sono, il valore è ignoto. Se ce ne sono, uno dopo l’altro.
12. Relazioni: almeno una riga, allo stesso modo.
13. Data di pubblicazione, con il giorno giuliano e l’anno UM.
14. Diritti: l’indirizzo della licenza scelta.

## Esempio, accorciato

```
BIOGRAPHY LIBRARY
IDENTIFICATIVO | IDENTIFIER: UM-0000-K3NQ-7FX2-MVP4
VERSIONE SCHEMA | SCHEMA VERSION: 1
NOME | NAME: Maria Rossi
EVENTO | EVENT: nascita | birth
  DATA | DATE: 1948-03-14 (EDTF)
  LUOGO | PLACE: Lugano | 46.004200 | 8.951200 | WGS 84 | geonames 2659836 | wikidata Q7024
PUBBLICATO | PUBLISHED: 2026-09-03 | GIORNO GIULIANO | JULIAN DAY: 2461288 | 0000 UM
DIRITTI | RIGHTS: https://creativecommons.org/licenses/by-nc-sa/4.0/
```

Nel pacchetto d’archivio la scheda sta in `record.txt` (queste righe) e in `record.json` (gli stessi fatti con un nome per ciascuno). Non sta dentro il testo della biografia.
