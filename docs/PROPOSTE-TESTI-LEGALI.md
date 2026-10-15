# Proposte testi legali

**Data:** 15 ottobre 2026  
**Stato:** solo lettura e approvazione. Non modifica `lib/legal/site-legal.ts` (lo farà Claudio dopo l’ok). Francese e tedesco delle voci nuove (oltre a C/D già forniti) verranno scritti dopo l’approvazione.

## Elenco voci

1. Privacy §3.5 — nuova voce «Echo conversation memory» (testi C, EN/IT/FR/DE)
2. Privacy — tabella di conservazione: riga dopo «AI suggestions» (testi D, EN/IT/FR/DE)
3. Privacy §13.1 — descrizione dell’assistente (fa meno cose, meglio)
4. Privacy §13.1 — scomparsa della traduzione automatica; le traduzioni le scrive l’autore
5. Privacy / Terms — controllo finale prima della stampa (preprint)
6. Privacy — rimozione dei metadati dalle foto
7. Privacy — registrazione del consumo IA (`ai_token_usage`)
8. Condizioni di servizio — foto al massimo 15 (non 30); peso file (5 MB nel testo vs 20 MB nel codice); nessun piano a pagamento (la terza parte è già vera)
9. Condizioni di servizio — affermazione sul controllo prima della pubblicazione (allineare alla realtà dello screening a pezzi)
10. Condizioni di servizio — «certificazione W3C Verifiable Credentials» (non presente oggi; se riappare, sostituire con identificativo UM)
11. Condizioni di servizio — limiti IA: «mensili» nei Terms vs 40 al giorno e 200 a settimana nel codice

**Trovate in più (segnalate, senza proposta di correzione in questa bozza):** retention «AI suggestions» solo fino a delete biografia vs purge Echo alla pubblicazione; Privacy §18 IT «non trasferiamo fuori dalla Svizzera» in tensione con altri paragrafi sul beta/UE.

---

## 1. Privacy §3.5 — Echo conversation memory (testo C)

**Dove sta oggi:** Privacy Policy, sezione «3.5 AI-Generated Data» / «3.5 Dati generati dall'IA» (`lib/legal/site-legal.ts`, blocco indice ~43–46 per lingua). Dopo «Prompts and requests submitted to the AI assistant» / «Prompt e richieste inviate all'assistente IA» non c’è alcuna voce sulla memoria di conversazione.

**Frase attuale (EN, voce prompt):** «Prompts and requests submitted to the AI assistant»

**Cosa manca vs codice:** Echo persiste chat (`agent_messages`), riassunto (`agent_threads.rolling_summary`) e note strutturate (`agent_memory_facts`); purge alla pubblicazione e se si disattivano le funzioni IA (`lib/agents/purge-agent-memory.ts`, `lib/server/ai-features-preference.ts`). Non è nelle esportazioni.

**Testo proposto (copiato senza cambi — tutte e quattro le lingue):**

**EN:** Echo conversation memory: while you work on a biography, the AI assistant keeps the chat history, a running summary and short notes (for example people you mention, your preferences, decisions taken and topics still open). This memory may contain personal data of third parties mentioned in the conversation. It is used solely to let you resume your work and to suggest questions; it is never part of the biography and never visible to readers. It is erased when the biography is published and deleted if you turn off AI features or delete the biography or your account. It is not included in data exports but is provided on request at support@biographylibrary.org.

**IT:** Memoria delle conversazioni con Echo: mentre lavori a una biografia, l'assistente AI conserva la cronologia della chat, un riassunto aggiornato e brevi note (per esempio le persone che nomini, le tue preferenze, le decisioni prese e gli argomenti ancora aperti). Questa memoria può contenere dati personali di terze persone menzionate nella conversazione. È usata esclusivamente per permetterti di riprendere il lavoro e per suggerirti domande; non fa mai parte della biografia e non è mai visibile ai lettori. Viene cancellata alla pubblicazione della biografia ed eliminata se disattivi le funzioni di AI o elimini la biografia o il tuo account. Non è inclusa nelle esportazioni dei dati, ma viene fornita su richiesta a support@biographylibrary.org.

**FR:** Mémoire des conversations avec Echo : pendant que vous travaillez sur une biographie, l'assistant IA conserve l'historique de la discussion, un résumé mis à jour et de courtes notes (par exemple les personnes que vous mentionnez, vos préférences, les décisions prises et les sujets encore ouverts). Cette mémoire peut contenir des données personnelles de tiers mentionnés dans la conversation. Elle sert uniquement à vous permettre de reprendre votre travail et à vous suggérer des questions ; elle ne fait jamais partie de la biographie et n'est jamais visible par les lecteurs. Elle est effacée à la publication de la biographie et supprimée si vous désactivez les fonctions d'IA ou supprimez la biographie ou votre compte. Elle n'est pas incluse dans les exports de données, mais vous est fournie sur demande à support@biographylibrary.org.

**DE:** Gesprächsgedächtnis von Echo: Während Sie an einer Biografie arbeiten, speichert der KI-Assistent den Chatverlauf, eine laufend aktualisierte Zusammenfassung und kurze Notizen (zum Beispiel zu erwähnten Personen, Ihren Vorlieben, getroffenen Entscheidungen und offenen Themen). Dieses Gedächtnis kann Personendaten von Dritten enthalten, die im Gespräch erwähnt werden. Es dient ausschliesslich dazu, dass Sie Ihre Arbeit fortsetzen können, und um Fragen vorzuschlagen; es ist nie Teil der Biografie und für Leserinnen und Leser nie sichtbar. Es wird bei der Veröffentlichung der Biografie gelöscht, ebenso wenn Sie die KI-Funktionen deaktivieren oder die Biografie oder Ihr Konto löschen. Es ist nicht in Datenexporten enthalten, wird Ihnen aber auf Anfrage an support@biographylibrary.org bereitgestellt.

---

## 2. Privacy — tabella di conservazione (testo D)

**Dove sta oggi:** Privacy Policy, tabella di conservazione, riga «AI suggestions» / «Suggerimenti dell'IA» (`lib/legal/site-legal.ts`, indici ~187–188).

**Frase attuale (EN):** «AI suggestions» → «Until the associated biography is deleted»

**Cosa è incompleto vs codice:** alla pubblicazione Echo viene già azzerato (`purgeAgentMemoryForBiography`); spegnendo le funzioni IA o cancellando biografia/account pure. Vedi `lib/agents/purge-agent-memory.ts`, `lib/server/ai-features-preference.ts`.

**Testo proposto (copiato senza cambi):**

| Lingua | Tipo | Periodo |
|--------|------|---------|
| EN | Echo conversation memory | Until the biography is published; deleted earlier if AI features are turned off or the biography or account is deleted |
| IT | Memoria delle conversazioni con Echo | Fino alla pubblicazione della biografia; eliminata prima se si disattivano le funzioni di AI o si elimina la biografia o l'account |
| FR | Mémoire des conversations avec Echo | Jusqu'à la publication de la biographie ; supprimée plus tôt en cas de désactivation des fonctions d'IA ou de suppression de la biographie ou du compte |
| DE | Gesprächsgedächtnis von Echo | Bis zur Veröffentlichung der Biografie; früher gelöscht, wenn die KI-Funktionen deaktiviert oder die Biografie bzw. das Konto gelöscht werden |

Posizione: nuova riga **dopo** «AI suggestions».

---

## 3. Privacy §13.1 — descrizione dell’assistente

**Dove sta oggi:** Privacy Policy §13.1 (`lib/legal/site-legal.ts`, indici ~153–158).

**Frasi attuali (EN):** elenco che include grammatica, suggerimenti di frasi, sostituzione di passaggi, «Translates the biography (you always review the result)», «Stimulates memories with guided questions».

**Cosa è falso o datato vs codice:** Echo oggi aiuta a scrivere sulla stessa pagina (bozze da accettare), fa domande, non traduce. Strumenti in barra: grammatica, aiuto, riassunto, revisione. Prova: `lib/agents/prompts/echo.ts`, `docs/PLATFORM_KB.md` (`ai_tools`, `conversation_mode`), editor senza Echo sulle edizioni (`lib/edition-ai.ts`).

**Testo proposto EN:** The optional writing assistant (Echo) and the formatting-bar tools help you with grammar checks, short summaries, clarity feedback, and questions that help you continue writing. Echo can propose wording that enters the page only if you accept it. The assistant can be wrong; you remain responsible for reviewing every suggestion before it becomes part of your biography. They do not publish for you.

**Testo proposto IT:** L’assistente di scrittura opzionale (Echo) e gli strumenti nella barra di formattazione aiutano con il controllo grammaticale, brevi riassunti, indicazioni di chiarezza e domande che ti aiutano a continuare. Echo può proporre un testo che entra nella pagina solo se lo accetti. L’assistente può sbagliare; la revisione di ogni suggerimento resta tua prima che entri nella biografia. Non pubblicano al posto tuo.

---

## 4. Scomparsa della traduzione automatica

**Dove sta oggi:** Privacy §13.1, voce «Translates the biography…» / «Traduce la biografia…» (`site-legal.ts`, indice ~157).

**Frase attuale (EN):** «Translates the biography (you always review the result)»

**Cosa è falso vs codice:** non esiste traduzione automatica; le traduzioni le scrive l’autore (o persona di fiducia) in una seconda edizione. Prova: `docs/PLATFORM_KB.md` sezione `translations`; `lib/agents/kb/help-kb-sections.locales.ts`.

**Testo proposto EN:** Remove the “Translates the biography…” bullet. If a sentence is needed: Translations are written by the author (or someone the author trusts). Biography Library does not machine-translate biographies.

**Testo proposto IT:** Togliere la voce «Traduce la biografia…». Se serve una frase: Le traduzioni le scrive l’autore (o chi di fiducia). Biography Library non traduce le biografie in automatico.

---

## 5. Controllo finale prima della stampa

**Dove sta oggi:** assente nei testi legali.

**Cosa manca vs codice:** esiste `POST /api/publication/preprint-check` («Final check before print»), non bloccante rispetto all’approvazione del PDF finale (`app/api/publication/approve-final-pdf/route.ts`).

**Testo proposto EN:** Before you approve the final PDF, you can run an optional final check that reviews the print-ready text. It does not replace the automated screening at publication and does not by itself publish the biography.

**Testo proposto IT:** Prima di approvare il PDF finale puoi avviare un controllo finale facoltativo sul testo pronto per la stampa. Non sostituisce lo screening automatico alla pubblicazione e non pubblica da solo la biografia.

---

## 6. Rimozione dei metadati dalle foto

**Dove sta oggi:** assente nei testi legali (il fatto è già nel manuale/KB).

**Cosa manca vs codice:** in upload il server ridimensiona, comprime e toglie posizione e altri dati nascosti (`lib/server/photo-processing.ts` e test correlati).

**Testo proposto EN:** When you upload photos, the server resizes and compresses them and removes location and other hidden metadata before storage.

**Testo proposto IT:** Quando carichi le foto, il server le ridimensiona e le comprime e toglie la posizione e gli altri metadati nascosti prima di salvarle.

---

## 7. Registrazione del consumo IA (`ai_token_usage`)

**Dove sta oggi:** assente nei testi legali.

**Cosa manca vs codice:** ogni chiamata AI registrata in `ai_token_usage` (migrazione `20260930115800_ai_token_usage.sql`, `lib/ai/usage-recorder.ts`). Non contiene il testo delle conversazioni; resta dopo il purge della memoria Echo.

**Testo proposto EN:** We record technical usage of AI features (model, purpose, token counts, timestamps) in `ai_token_usage` to enforce limits and operate the service. These records do not store the wording of your chat or biography text.

**Testo proposto IT:** Registriamo l’uso tecnico delle funzioni IA (modello, scopo, conteggio token, orari) in `ai_token_usage` per applicare i limiti e far funzionare il servizio. Queste registrazioni non conservano il testo della chat né della biografia.

---

## 8. Condizioni di servizio — foto 15, peso file, niente piani a pagamento

**Dove sta oggi:** Terms §4 Immagini (`site-legal.ts`, blocco EN ~4500, IT ~3906).

**Frase attuale (EN):** «Each biography may include up to 30 images. Each file is at most 5 megabytes. Video is not accepted. There is no paid plan: the archive stays free.»

**Cosa è falso vs codice:** galleria max **15** (`lib/biography-media-constants.ts`); upload fino a **20 MB** (`lib/server/photo-processing.ts`) mentre il testo legale dice ancora **5 megabyte**. «There is no paid plan» è **vero** rispetto al codice attuale.

**Testo proposto EN:** Each biography may include up to 15 gallery photos, plus a cover. Each upload is at most 20 megabytes before processing (the previous legal text said 5 megabytes). Video is not accepted. There is no paid plan: the archive stays free.

**Testo proposto IT:** Ogni biografia può includere fino a 15 foto in galleria, più una copertina. Ogni file caricato non supera i 20 megabyte prima dell’elaborazione (il testo legale precedente diceva 5 megabyte). Non si caricano video. Non esiste un piano a pagamento: l’archivio resta gratuito.

---

## 9. Condizioni di servizio — controllo prima della pubblicazione

**Dove sta oggi:** Terms e Privacy dicono già che c’è una scansione automatica (EN Terms: «Every biography undergoes automated scanning before publication.» Privacy IT: «Prima della pubblicazione, ogni biografia viene sottoposta a una scansione automatizzata…»). La frase «non verifichiamo i contenuti prima della pubblicazione» **non compare** nel testo attuale di `site-legal.ts`.

**Cosa allineare vs codice:** lo screening automatico esamina tutto il testo pubblico a pezzi (chunk) sull’intera biografia prima della pubblicazione (`lib/server/review-submit-pipeline.ts`, `lib/server/screening-public-text.ts`). Non è una revisione umana obbligatoria di ogni riga; è un controllo automatico sull’intero testo destinato al pubblico.

**Testo proposto EN:** Before publication, every biography’s public text is examined by an automated check that processes the whole public text in segments. This is not a human line-by-line review of every biography.

**Testo proposto IT:** Prima della pubblicazione, tutto il testo pubblico di ogni biografia è esaminato da un controllo automatico che lo elabora a segmenti. Non è una revisione umana riga per riga di ogni biografia.

---

## 10. Condizioni di servizio — W3C Verifiable Credentials → UM

**Dove sta oggi:** in `lib/legal/site-legal.ts` **non compare** «W3C Verifiable Credentials». Compare invece l’identificativo UM (Terms, sezioni su UM / Specifica UM).

**Cosa è falso se riapparisse:** il prodotto emette identificativi UM (`docs/UM-IDENTIFIER-SPEC.md`), non credenziali W3C VC.

**Testo proposto EN:** Each biography receives one permanent UM identifier issued by Biography Library. See the UM Identifier Specification. (Do not claim W3C Verifiable Credentials.)

**Testo proposto IT:** Ogni biografia riceve un identificativo UM permanente emesso da Biography Library. Vedi la Specifica dell’identificativo UM. (Non affermare certificazioni W3C Verifiable Credentials.)

---

## 11. Condizioni di servizio — limiti IA (mensili vs giorno/settimana)

**Dove sta oggi:** Terms, sezioni sui limiti d’uso dell’assistente (`site-legal.ts`).

**Frase attuale (EN, sintesi):** limiti descritti come giornalieri e **mensili**.

**Cosa è falso vs codice:** grammatica e strumenti correlati usano **40 al giorno** e **200 a settimana** UTC (`lib/ai/grammar-limits.ts`, default `AI_DAILY_LIMIT=40`, `AI_WEEKLY_LIMIT=200` in `.env.example`). Non esiste un tetto mensile nel codice.

**Testo proposto EN:** Fair-use limits for optional AI writing tools are 40 requests per UTC day and 200 per UTC week (Monday–Sunday), unless staff settings say otherwise. There is no separate monthly cap in the product.

**Testo proposto IT:** I limiti di uso equo degli strumenti IA di scrittura opzionali sono 40 richieste al giorno UTC e 200 a settimana UTC (lunedì–domenica), salvo impostazioni dello staff. Nel prodotto non c’è un tetto mensile separato.

---

## Altre frasi che contraddicono il codice (solo segnalazione)

1. Tabella retention «AI suggestions» solo «fino all’eliminazione della biografia» vs purge memoria Echo **alla pubblicazione**.
2. Privacy §18 IT («Non trasferiamo dati personali al di fuori della Svizzera») in tensione con altri paragrafi sullo stesso documento relativi a fornitori/UE in fase beta.
