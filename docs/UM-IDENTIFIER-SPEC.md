---
name: bl-specifica-identificativo-um
description: Specifica pubblica dell'identificativo permanente UM emesso da Biography Library per ogni scheda del proprio archivio. Documento destinato alla pubblicazione sul sito, al deposito dentro l'archivio stesso e all'incisione sui supporti fisici.
---

# Identificativo UM

**Specifica pubblica, versione 1.0**
Emessa dall'Associazione Biography Library, Lugano, Svizzera.
3 settembre 2026, Anno 0 UM.

*Questa versione italiana è la versione autorevole. Le traduzioni in inglese, francese e tedesco sono in preparazione e, una volta pubblicate, avranno pari valore.*

## 1. A che cosa serve

Ogni scheda dell'archivio di Biography Library riceve alla creazione un identificativo permanente. È una breve stringa di caratteri che non cambia mai, che non viene mai riassegnata a un'altra scheda, e che serve a ritrovare quella scheda anche quando l'indirizzo web con cui è stata pubblicata non esiste più.

L'identificativo non sostituisce l'indirizzo leggibile di una biografia: si affianca. L'indirizzo serve alle persone di oggi, l'identificativo serve a chiunque, fra dieci o mille anni, trovi quella stringa citata da qualche parte e voglia risalire alla scheda.

UM sta per Memoria Universale, che è anche il nome del sistema con cui Biography Library conta gli anni a partire dal 2026 del calendario gregoriano, assunto come Anno 0 UM.

Le lettere UM fanno parte dell'identificativo stesso e non cambiano in nessuna lingua: non sono un'abbreviazione da tradurre, ma i primi due caratteri della stringa. Un identificativo si scrive e si legge allo stesso modo ovunque.

## 2. A chi legge questo documento nel futuro

Questa sezione è scritta per chi trova la stringa incisa su un supporto fisico e non sa che cosa sia.

La stringa è un nome. Non descrive la persona a cui si riferisce e non contiene informazioni su di lei. Serve soltanto a distinguere una scheda da tutte le altre.

La stringa comincia sempre con le due lettere UM. Seguono quattro o più cifre, che indicano l'anno in cui la scheda è stata creata, contato a partire da un anno zero. Seguono dodici caratteri, che sono un nome arbitrario assegnato a quella scheda, e l'ultimo dei dodici è un carattere di verifica che permette di accorgersi se qualcuno ha copiato la stringa sbagliando un carattere. La sezione 6 spiega come calcolarlo, e il calcolo si può fare a mano con carta e penna.

I caratteri usati sono soltanto ventinove: le dieci cifre e diciannove lettere. Le vocali sono escluse di proposito, perché così la stringa non può formare parole per caso in nessuna lingua. Sono escluse anche le lettere che si confondono con le cifre.

## 3. Forma canonica

```
UM-0000-K3NQ-7FX2-MVP4
```

L'identificativo si compone di quattro parti separate da trattini.

`UM` è il nome dello schema ed è sempre uguale.

`0000` è l'anno UM in cui la scheda è stata creata, scritto con almeno quattro cifre e completato con zeri a sinistra. L'anno 0 UM corrisponde al 2026 del calendario gregoriano, e ogni anno UM comincia il primo gennaio di quel calendario. Il cambio d'anno è determinato in tempo universale coordinato, non nell'ora locale del luogo di emissione, così che l'anno assegnato non dipenda dal fuso orario né dalle regole locali sull'ora legale. Oltre l'anno 9999 UM il campo diventa di cinque cifre, e chi legge non deve dare per scontato che sia lungo esattamente quattro.

I tre gruppi finali di quattro caratteri sono il corpo dell'identificativo: undici caratteri assegnati alla scheda e un dodicesimo carattere di controllo, che è sempre l'ultimo.

La forma canonica scritta usa le lettere maiuscole, perché sono più leggibili incise su una superficie dura e trascritte a mano.

## 4. Alfabeto

Il corpo dell'identificativo usa esclusivamente questi ventinove caratteri, elencati nel loro ordine, che è anche il loro valore numerico da 0 a 28:

```
0 1 2 3 4 5 6 7 8 9 B C D F G H J K M N P Q R S T V W X Z
```

Sono escluse le cinque vocali A, E, I, O, U e la lettera L. L'esclusione delle vocali impedisce che si formino parole di senso compiuto, che invecchiano male e possono risultare offensive in lingue che oggi non conosciamo. L'esclusione di L, insieme a quella di O e I, elimina le confusioni più comuni nella trascrizione a mano, cioè fra L e 1, fra O e 0, fra I e 1.

Il campo dell'anno usa soltanto le cifre da 0 a 9.

## 5. Confronto e normalizzazione

Due identificativi sono lo stesso identificativo se coincidono dopo questa normalizzazione: rimozione di tutti i trattini e di tutti gli spazi, e conversione a un'unica cassa di caratteri.

I trattini servono solo alla leggibilità e non fanno parte dell'identità. `UM-0000-K3NQ-7FX2-MVP4`, `UM0000K3NQ7FX2MVP4` e `um-0000-k3nq-7fx2-mvp4` sono la stessa cosa. Qualunque sistema che accetti questi identificativi deve accettarli in tutte queste forme.

## 6. Il carattere di controllo

L'ultimo carattere dell'identificativo è calcolato a partire da tutti quelli che lo precedono, escluse le lettere UM e i trattini.

Il procedimento è questo. Si prende la stringa formata dalle cifre dell'anno seguite dagli undici caratteri del corpo. Si numerano le posizioni a partire da uno. Si sostituisce ogni carattere con il suo valore secondo l'alfabeto della sezione 4. Si moltiplica ogni valore per la sua posizione. Si sommano tutti i prodotti. Si divide la somma per ventinove e si prende il resto. Il carattere di controllo è quello che, nell'alfabeto, occupa la posizione indicata da quel resto.

Il numero ventinove è stato scelto perché è primo, e questo garantisce due proprietà dimostrabili: il controllo rileva sempre la sostituzione di un singolo carattere, e rileva sempre lo scambio di due caratteri adiacenti. Sono i due errori di trascrizione più frequenti.

Esempio completo, per `UM-0000-K3NQ-7FX2-MVP4`.

| Posizione | Carattere | Valore | Prodotto |
|---|---|---|---|
| 1 | 0 | 0 | 0 |
| 2 | 0 | 0 | 0 |
| 3 | 0 | 0 | 0 |
| 4 | 0 | 0 | 0 |
| 5 | K | 17 | 85 |
| 6 | 3 | 3 | 18 |
| 7 | N | 19 | 133 |
| 8 | Q | 21 | 168 |
| 9 | 7 | 7 | 63 |
| 10 | F | 13 | 130 |
| 11 | X | 27 | 297 |
| 12 | 2 | 2 | 24 |
| 13 | M | 18 | 234 |
| 14 | V | 25 | 350 |
| 15 | P | 20 | 300 |

La somma dei prodotti è 1802. Il resto della divisione di 1802 per 29 è 4. Il carattere in posizione 4 dell'alfabeto è `4`, che è infatti l'ultimo carattere dell'identificativo.

Quando l'anno ha più di quattro cifre il procedimento non cambia: le posizioni si numerano sempre a partire dalla prima cifra dell'anno, e la stringa su cui si calcola diventa semplicemente più lunga.

## 7. Vettori di prova

Qualunque implementazione deve produrre esattamente questi risultati.

| Anno UM | Corpo assegnato | Identificativo completo |
|---|---|---|
| 0 | K3NQ7FX2MVP | `UM-0000-K3NQ-7FX2-MVP4` |
| 0 | BCDFGHJKMNP | `UM-0000-BCDF-GHJK-MNPP` |
| 1 | 00000000000 | `UM-0001-0000-0000-0004` |
| 25 | Z9X8W7V6T5S | `UM-0025-Z9X8-W7V6-T5ST` |
| 100 | QQQQQQQQQQQ | `UM-0100-QQQQ-QQQQ-QQQQ` |
| 9999 | K3NQ7FX2MVP | `UM-9999-K3NQ-7FX2-MVP7` |
| 10000 | K3NQ7FX2MVP | `UM-10000-K3NQ-7FX2-MVP3` |
| 99999 | Z9X8W7V6T5S | `UM-99999-Z9X8-W7V6-T5S2` |

Gli ultimi tre vettori esistono per una ragione precisa. Il campo dell'anno è variabile, e una regola scritta ma mai esercitata viene ignorata da chi scrive il codice: un'implementazione che dia per scontate quattro cifre supera tutti gli altri vettori e fallisce soltanto sui due con l'anno lungo. È un difetto che deve emergere il giorno in cui l'implementazione viene scritta, non nell'anno in cui il campo si allunga.

## 8. Regole di emissione

L'identificativo è assegnato al momento della creazione della scheda e non è mai modificato.

Non è mai riassegnato a un'altra scheda, nemmeno se la scheda originaria viene cancellata, perché altri documenti e altri sistemi possono averla già citata.

Il corpo di undici caratteri è generato in modo casuale. Non contiene, e non deve mai contenere, alcuna informazione sulla persona: non il nome, non le date, non il luogo, non il numero d'ordine di iscrizione. Un identificativo non deve rivelare nulla di chi identifica.

L'unicità è garantita dal registro dell'associazione, non dalla probabilità: prima di assegnare un identificativo il sistema verifica che non esista già, e in caso di collisione ne genera un altro. Lo spazio disponibile per ogni anno è di 29 elevato all'undicesima potenza, cioè circa dodici milioni di miliardi di combinazioni.

## 9. Risoluzione

Un identificativo si risolve, cioè porta alla scheda corrispondente, all'indirizzo canonico:

```
https://id.biographylibrary.org/UM-0000-K3NQ-7FX2-MVP4
```

Il sottodominio `id` è stato scelto perché nomina una funzione e non una tecnologia, e perché è un solo record di rete: può essere ripuntato verso qualunque sistema futuro senza modificare né l'archivio né gli identificativi già emessi. L'associazione può rendere disponibili indirizzi alternativi equivalenti, ma questo è quello che si impegna a mantenere.

L'indirizzo accetta l'identificativo con o senza trattini e in qualunque cassa di caratteri.

Un identificativo emesso risponde per sempre, anche quando la scheda non è più accessibile al pubblico. In quel caso l'indirizzo restituisce una pagina che dichiara che l'identificativo esiste, quando è stato emesso, e che il contenuto non è consultabile. Un identificativo permanente che restituisce un errore di pagina non trovata è un identificativo rotto, e questa è la sola cosa che l'associazione si impegna a non fare mai.

L'indirizzo web non fa parte dell'identità. La stringa `UM-0000-K3NQ-7FX2-MVP4` è l'identificativo; il dominio che oggi la risolve è soltanto lo strumento con cui la si consulta, e può cambiare.

## 10. L'autorità emittente

Gli identificativi UM sono emessi esclusivamente dall'Associazione Biography Library, con sede a Lugano, Canton Ticino, Svizzera, iscritta al registro di commercio del Cantone Ticino con numero CHE-416.014.530, il cui scopo statutario è la preservazione della memoria umana e del patrimonio culturale immateriale.

Nessun altro soggetto è autorizzato a emettere identificativi che comincino con `UM-` secondo questa specifica. Chiunque trovi una stringa in questa forma può assumere che sia stata emessa da questa associazione, o dai suoi successori designati.

L'associazione si impegna a mantenere la risoluzione degli identificativi emessi, a pubblicare questa specifica in forma stabile e accessibile, e a depositarne copia dentro il proprio archivio, insieme alle biografie e sugli stessi supporti fisici, così che la specifica sopravviva a qualunque sito web.

## 11. Versione della specifica

Questa è la versione 1.0. Le versioni successive potranno aggiungere regole ma non potranno invalidare identificativi già emessi. Il formato, l'alfabeto e l'algoritmo di controllo descritti qui sono definitivi per tutti gli identificativi che cominciano con `UM-`.

Ogni versione della specifica porta la propria data in doppia notazione, calendario gregoriano e anno UM.

Revisione editoriale del 19 settembre 2026 (Anno 0 UM): aggiunti tre vettori di prova con l'anno a quattro e a cinque cifre, e una riga nella sezione 6 che chiarisce come si numerano le posizioni quando l'anno è più lungo. Nessuna regola è cambiata, nessun identificativo già emesso è toccato, e ogni implementazione conforme alla versione 1.0 resta conforme.

## 12. Se Biography Library cessasse di esistere

Lo statuto dell'associazione prevede che in caso di scioglimento l'archivio sia affidato a un ente custode designato dall'assemblea e che il codice resti pubblico. In quel caso l'ente custode subentra nell'obbligo di risoluzione degli identificativi già emessi, e questa specifica resta valida senza modifiche.

Se nessun ente custode dovesse subentrare, gli identificativi restano comunque leggibili e verificabili, perché tutto ciò che serve per interpretarli è contenuto in questo documento, che è depositato insieme all'archivio.

## 13. Dove vive questa specifica

Questo documento è pubblicato in forma stabile sul sito dell'associazione, è depositato nel repository pubblico del codice, è incluso in ogni esportazione completa dell'archivio, ed è riprodotto sui supporti fisici di conservazione a lunga durata insieme alle biografie.

## 14. Implementazione di riferimento

```ts
// Identificativo UM, specifica 1.0
const ALPHABET = "0123456789bcdfghjkmnpqrstvwxz"; // 29 caratteri, 29 e' primo
const IDX = new Map([...ALPHABET].map((c, i) => [c, i]));

/** Carattere di controllo su "cifre dell'anno" + "undici caratteri del corpo". */
export function checkChar(core: string): string {
  let sum = 0;
  for (let i = 0; i < core.length; i++) sum += (i + 1) * (IDX.get(core[i]) ?? 0);
  return ALPHABET[sum % 29];
}

export function normalize(s: string): string {
  return s.replace(/[-\s]/g, "").toLowerCase();
}

/** Genera un identificativo. `random11` va prodotto con un generatore
 *  crittograficamente sicuro e verificato contro il registro prima dell'uso.
 *  `padStart` non tronca: oltre l'anno 9999 il campo si allunga da solo. */
export function mint(umYear: number, random11: string): string {
  const year = String(umYear).padStart(4, "0");
  const body = random11 + checkChar(year + random11);
  return `UM-${year}-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`.toUpperCase();
}

export function isValid(s: string): boolean {
  const t = normalize(s);
  if (!t.startsWith("um")) return false;
  const rest = t.slice(2);
  if (rest.length < 16) return false;
  const year = rest.slice(0, rest.length - 12);
  const body = rest.slice(rest.length - 12);
  if (year.length < 4 || !/^\d+$/.test(year)) return false;
  if (![...body].every((c) => IDX.has(c))) return false;
  return checkChar(year + body.slice(0, 11)) === body[11];
}
```

L'algoritmo è volutamente semplice: usa solo moltiplicazione, somma e resto della divisione, e può essere eseguito a mano da chiunque sappia fare i conti, senza alcun calcolatore.
