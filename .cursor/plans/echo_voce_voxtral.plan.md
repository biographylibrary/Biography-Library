---
name: Echo voce, sintesi su Mistral Voxtral TTS
overview: "Piano isolato per sostituire SOLO la sintesi vocale di Echo, da Kokoro autoospitato a Mistral Voxtral TTS via API. Non tocca il cervello (chat/stream gia implementato), non tocca i thread, non tocca la UI della sessione voce, non tocca il riconoscimento vocale. Il riconoscimento vocale RESTA su Whisper di Infomaniak in Svizzera per la beta: e gia integrato, e sovrano svizzero, e per il push-to-talk non guadagna nulla a spostarlo. Lo swap e dietro un interruttore ECHO_VOICE_PROVIDER, quindi reversibile: Kokoro e il fallback del browser restano intatti. Voxtral via API a pagamento, quindi nessun problema con la licenza non commerciale dei pesi aperti."
todos:
  - id: v0-mistral-account
    content: "V0: account Mistral, chiave API; voci, EN/FR dai predefiniti, IT/DE da clonazione di un campione nativo o adattamento cross-lingua; test di QUALITA su italiano e tedesco; verifica slug voxtral-mini-tts-2603; dipendenza @mistralai/mistralai"
    status: pending
  - id: v1-env
    content: "V1: variabili d'ambiente MISTRAL_API_KEY, ECHO_VOICE_PROVIDER, ECHO_TTS_MODEL, ECHO_TTS_VOICE_* ripuntate sui voice_id Voxtral"
    status: pending
  - id: v2-voice-config
    content: "V2: lib/echo/voice-config.ts, aggiungere echoVoiceProvider() e voxtralVoiceIdForLanguage(), isEchoTtsConfigured() consapevole del provider, mantenere le funzioni Kokoro"
    status: pending
  - id: v3-voxtral-client
    content: "V3: lib/echo/voxtral-tts.ts, synthesizeVoxtralSpeech(text, language) via SDK Mistral, decodifica base64 audio_data, stessa firma di kokoro-tts.ts"
    status: pending
  - id: v4-route-dispatch
    content: "V4: app/api/agents/echo/tts/route.ts, smistare per provider mantenendo identico il contratto audio/mpeg, cosi echo-playback.ts ed EchoVoiceSession.tsx non cambiano"
    status: pending
  - id: v5-docs
    content: "V5: aggiornare docs/ECHO_VOICE.md a v3, Voxtral TTS, Kokoro retrocesso a fallback, STT resta Infomaniak, nota licenza e costo"
    status: pending
  - id: v6-stt-rinviato
    content: "V6 (RINVIATO, non per la beta): route STT Voxtral e Realtime per il full-duplex, Fase 2 con aiuto professionale"
    status: pending
isProject: false
---

# Echo voce: sintesi su Mistral Voxtral TTS

Piano isolato, da eseguire con Cursor, che riguarda solo lo strato di sintesi vocale di Echo. Tutto il resto della voce e degli agenti e gia implementato e non va toccato.

## La decisione, e perche

Sposto **solo la sintesi vocale** (text-to-speech) da Kokoro autoospitato a **Mistral Voxtral TTS** via API. Il guadagno concreto e che sparisce l'unico pezzo di infrastruttura da gestire in tutta la pila voce: il container Docker di Kokoro descritto oggi in `docs/ECHO_VOICE.md:102-134`. La residenza dei dati non peggiora, Kokoro era gia in Unione Europea e Mistral La Plateforme e in Francia, e le voci di Voxtral sono migliori e clonabili. Via API a pagamento non si pone il problema della licenza CC-BY-NC dei pesi aperti, che riguarda solo chi se li autoospita.

**Non** sposto il riconoscimento vocale (speech-to-text). Resta su **Whisper di Infomaniak in Svizzera**, dov'e oggi (`lib/echo/whisper-stt.ts`, via la funzione edge Supabase `audio-transcription`). Tre motivi: e gia integrato e funzionante, e sovrano svizzero quindi migliore della Francia per la tua storia di prodotto, e per il push-to-talk della beta un riconoscimento in streaming non porta alcun vantaggio. Spostarlo su Voxtral significherebbe perdere la residenza svizzera e aggiungere una dipendenza per zero benefici nella beta. Voxtral Realtime per il riconoscimento ha senso solo quando costruirai il full-duplex vero, ed e Fase 2 con aiuto (vedi V6). Questo e il punto in cui mi discosto da "tutto l'audio su Mistral": tienine meta su Infomaniak, e quella sovrana svizzera.

Lo swap e dietro un interruttore `ECHO_VOICE_PROVIDER`, quindi reversibile in un secondo: se Voxtral delude, torni a `kokoro` o al fallback del browser senza toccare codice.

Il cervello di Echo (la chat in streaming, i thread, gli strumenti) non c'entra con questo piano. Il cambio del modello del cervello da Gemma a Mistral su Infomaniak sta nell'altro piano, non qui.

## Mappa del codice attuale, da leggere prima

Stato della voce, verificato. Il riconoscimento vocale e in `lib/echo/whisper-stt.ts:16-61`, manda il blob audio alla funzione edge Supabase `audio-transcription` che parla con Whisper di Infomaniak. La sintesi attuale e in `lib/echo/kokoro-tts.ts:5-38`, `synthesizeKokoroSpeech(text, language)` fa una POST OpenAI-compatibile a `${ECHO_TTS_BASE_URL}/audio/speech` e restituisce un `ArrayBuffer` di mp3. La configurazione delle voci e in `lib/echo/voice-config.ts`, con `kokoroVoiceForLanguage()` (`:14-29`) e `isEchoTtsConfigured()` (`:31-33`). La route proxy e in `app/api/agents/echo/tts/route.ts`, autenticata con `authenticateAgentRequest` (`:17`), chiama `synthesizeKokoroSpeech` (`:47`) e risponde `audio/mpeg` (`:52-58`); la GET espone `{ configured, provider: 'kokoro', region }` (`:8-14`). La riproduzione lato client e in `lib/echo/echo-playback.ts`: `speakEchoReply()` (`:76-127`) fa la POST a `/api/agents/echo/tts`, riproduce l'mp3, e ricade sul browser via `speakWithBrowser()` (`:42-71`) se la route fallisce.

Il punto chiave dell'architettura: la riproduzione client e la sessione voce parlano con la route, non con il provider. Quindi se la route continua a rispondere `audio/mpeg`, **`lib/echo/echo-playback.ts`, `components/echo/EchoVoiceSession.tsx` e tutta la UI restano invariati**. Lo swap vive interamente lato server, dietro la route.

## Cosa NON toccare (la separazione)

Non toccare il riconoscimento vocale `lib/echo/whisper-stt.ts` ne la funzione edge condivisa `supabase/functions/audio-transcription/index.ts`, che serve anche il `VoiceRecorder` dell'editor a sezioni: cambiarla romperebbe un'altra funzione. Non toccare `lib/echo/echo-playback.ts`, `components/echo/EchoVoiceSession.tsx`, la chat in streaming, i thread, gli strumenti di Echo. Non toccare `app/api/agents/echo/voice/route.ts`, che resta il 501 riservato al full-duplex futuro.

---

## V0: prerequisiti Mistral (spike, prima di scrivere codice)

Creare l'account su `console.mistral.ai`, generare una chiave API, attivare la fatturazione (ci sono crediti gratuiti per i test).

Sulle voci, punto verificato e importante. Il modello Voxtral TTS parla nove lingue, italiano e tedesco inclusi, ma i timbri di voce **predefiniti** sono solo inglese (americano e britannico) e francese. Le lingue non sono un limite, lo sono i timbri pronti. Quindi: per inglese e francese si usano i `voice_id` predefiniti cosi come sono; per italiano e tedesco si ottiene una voce in due modi, o adattamento cross-lingua, cioe si fa pronunciare l'italiano a un timbro predefinito o clonato, oppure, scelta migliore per l'italiano che e la lingua centrale del prodotto, si **clona una voce italiana nativa** da circa tre secondi di campione audio e si ottiene un `voice_id` con accento e timbro giusti; stesso ragionamento per il tedesco. Raccogliere i quattro `voice_id` risultanti.

Verificare lo slug del modello, atteso `voxtral-mini-tts-2603`.

Test di V0, ora di qualita e non di fattibilita: sintetizzare due o tre frasi in **italiano** e in **tedesco** e giudicare se l'accento e la naturalezza sono accettabili per il prodotto; inglese e francese sono coperti dai predefiniti e a basso rischio. Se l'italiano clonato non convince, provare l'adattamento cross-lingua da un altro timbro prima di rinunciare. Se una lingua resta insoddisfacente, NON forzarla: si lascia vuoto il suo `voice_id` e quella lingua ricade automaticamente sulla voce del browser (vedi V4 e `echo-playback.ts`), decente per il tedesco sulla maggior parte dei sistemi.

Aggiungere la dipendenza ufficiale: `@mistralai/mistralai`. Motivo: le API audio di Mistral non sono OpenAI-compatibili come Kokoro e la forma REST non e interamente pubblica; l'SDK e il percorso documentato e toglie il rischio di indovinare il path e la decodifica.

Criterio di accettazione: una chiamata di test produce audio comprensibile e naturale in italiano e tedesco oltre che in inglese e francese, e hai i `voice_id` per le lingue che superano il test.

---

## V1: variabili d'ambiente

Da aggiungere:

```env
# Provider di sintesi vocale di Echo: voxtral | kokoro
ECHO_VOICE_PROVIDER=voxtral

# Mistral La Plateforme (Francia/UE) per la sola sintesi vocale
MISTRAL_API_KEY=
ECHO_TTS_MODEL=voxtral-mini-tts-2603

# voice_id raccolti in Mistral Studio (V0), uno per lingua
ECHO_TTS_VOICE_IT=
ECHO_TTS_VOICE_EN=
ECHO_TTS_VOICE_FR=
ECHO_TTS_VOICE_DE=
```

Le vecchie variabili Kokoro (`ECHO_TTS_BASE_URL`, eccetera) restano valide quando `ECHO_VOICE_PROVIDER=kokoro`. Il riconoscimento vocale continua a usare i segreti Infomaniak esistenti, nessuna variabile nuova per lo speech-to-text.

Nota: i nomi `ECHO_TTS_VOICE_*` esistono gia per Kokoro e oggi contengono ID Kokoro come `if_sara`. Con provider `voxtral` contengono invece i `voice_id` Mistral. Non confonderli tra i due provider.

---

## V2: configurazione voci consapevole del provider

In `lib/echo/voice-config.ts`, in modo additivo senza rimuovere le funzioni Kokoro:

Aggiungere `echoVoiceProvider(): 'voxtral' | 'kokoro'` che legge `ECHO_VOICE_PROVIDER`, default `kokoro` per retrocompatibilita finche non imposti l'ambiente.

Aggiungere `voxtralVoiceIdForLanguage(appLanguage: string): string | null` con la stessa logica di `kokoroVoiceForLanguage` (`:14-29`): mappa `it|en|fr|de` sulle variabili `ECHO_TTS_VOICE_*`, fallback su inglese; restituisce `null` se manca, cosi la route puo degradare con grazia.

Rendere `isEchoTtsConfigured()` (`:31-33`) consapevole del provider: con `voxtral` e configurato se esistono `MISTRAL_API_KEY` e almeno un `voice_id`; con `kokoro` resta la condizione attuale su `ECHO_TTS_BASE_URL`.

Criterio di accettazione: con l'ambiente impostato su voxtral, `isEchoTtsConfigured()` e vero e `voxtralVoiceIdForLanguage('it')` restituisce il voice_id italiano.

---

## V3: client Voxtral TTS

Creare `lib/echo/voxtral-tts.ts` con la stessa firma del client Kokoro, cosi la route cambia il minimo:

```ts
export async function synthesizeVoxtralSpeech(
  text: string,
  language: string
): Promise<ArrayBuffer | null>
```

Dentro: istanziare il client `@mistralai/mistralai` con `MISTRAL_API_KEY`; chiamare l'endpoint di generazione vocale con `model = ECHO_TTS_MODEL`, `input = testo`, `voice_id = voxtralVoiceIdForLanguage(language)`, `response_format = 'mp3'`. La risposta arriva con l'audio in **base64 nel campo `audio_data`**: decodificarlo in `Buffer`/`ArrayBuffer` e restituirlo. Se manca il voice_id o la chiave, restituire `null`. Mantenere un tetto sui caratteri come fa Kokoro (`MAX_INPUT_CHARS = 4096` in `kokoro-tts.ts:3`), utile anche per il costo, visto che Voxtral TTS si paga a caratteri (0,016 dollari ogni mille). Gestire l'errore come Kokoro (`kokoro-tts.ts:32-37`): log e `return null`, mai lanciare fino alla route.

Criterio di accettazione: una chiamata diretta alla funzione restituisce un ArrayBuffer mp3 riproducibile per ciascuna delle quattro lingue.

---

## V4: smistamento nella route, contratto invariato

In `app/api/agents/echo/tts/route.ts`, mantenendo identici autenticazione (`:17`) e risposta `audio/mpeg` (`:52-58`):

Sostituire la chiamata fissa a `synthesizeKokoroSpeech` (`:47`) con uno smistamento su `echoVoiceProvider()`: se `voxtral` chiama `synthesizeVoxtralSpeech`, se `kokoro` chiama `synthesizeKokoroSpeech`. Aggiornare la GET (`:8-14`) perche `provider` rifletta quello attivo e la regione sia `eu-mistral` per voxtral. La gestione del 503 quando non configurato (`:22-30`) resta, ora basata su `isEchoTtsConfigured()` consapevole del provider.

Importante: non cambiare la forma della risposta. La riproduzione client `lib/echo/echo-playback.ts:96-119` si aspetta byte audio dal corpo della risposta e li suona; restando `audio/mpeg` non va modificata. Opzionale e solo cosmetico: aggiungere `'voxtral'` al tipo `EchoSpeechBackend` in `echo-playback.ts:5` per log piu precisi, ma la riproduzione e identica.

Criterio di accettazione: con provider voxtral, parlando a Echo e ricevendo la risposta, la voce esce da Voxtral; spegnendo l'ambiente Voxtral si ricade sul browser; rimettendo `ECHO_VOICE_PROVIDER=kokoro` con il container attivo torna Kokoro. Nessuna modifica a UI o riproduzione.

---

## V5: aggiornare la documentazione

Portare `docs/ECHO_VOICE.md` a v3: la sintesi vocale e Voxtral TTS via API Mistral (Francia/UE), Kokoro retrocesso da scelta principale a fallback dietro l'interruttore, il container Docker non e piu necessario per la beta. Dichiarare esplicitamente che il riconoscimento vocale resta Whisper di Infomaniak in Svizzera e perche. Aggiungere la nota di licenza: API a pagamento, quindi la CC-BY-NC dei pesi aperti non si applica. Aggiungere il costo: circa 0,011 dollari per minuto di parlato di Echo, dato che la sintesi si paga 0,016 dollari ogni mille caratteri e una risposta tipica e sui settecento caratteri al minuto. Tenere la sezione del fallback del browser, che non cambia.

---

## V6: riconoscimento Voxtral e full-duplex (RINVIATO, non per la beta)

Da non fare adesso. Quando costruirai il full-duplex vero con interruzione, in Fase 2 con aiuto professionale: introdurre il riconoscimento vocale Voxtral (offline `voxtral-mini-latest`, oppure Voxtral Realtime in streaming) e orchestrare ascolto, cervello e voce con Pipecat o LiveKit, attivando finalmente la route `app/api/agents/echo/voice/route.ts` oggi a 501. Solo allora ha senso togliere Whisper di Infomaniak dal percorso, valutando anche se a quel punto conviene autoospitare l'intero stack Voxtral in Svizzera (con licenza commerciale per i pesi se il prodotto e considerato commerciale).

---

## Ordine di esecuzione e ripiego

V0 e il prerequisito bloccante: senza i `voice_id` e la verifica dello slug non parte nulla. Poi V1 e V2, la configurazione. Poi V3 e V4, il client e lo smistamento, che e il grosso. Poi V5, la documentazione. V6 non si tocca.

Ripiego immediato in caso di problemi: `ECHO_VOICE_PROVIDER=kokoro` se il container e ancora in piedi, oppure togliere del tutto la configurazione di sintesi e lasciare il fallback del browser di `echo-playback.ts`, che funziona senza server. Nessuna di queste vie tocca il riconoscimento vocale ne il cervello, quindi Echo continua a capire e a rispondere a testo in ogni caso.

## File toccati

**Nuovi:** `lib/echo/voxtral-tts.ts`.

**Modificati:** `lib/echo/voice-config.ts` (additivo), `app/api/agents/echo/tts/route.ts` (smistamento), `docs/ECHO_VOICE.md`, `package.json` (dipendenza SDK), opzionale `lib/echo/echo-playback.ts` (solo etichetta di log).

**Invariati di proposito:** `lib/echo/whisper-stt.ts`, `lib/echo/kokoro-tts.ts`, `supabase/functions/audio-transcription/index.ts`, `components/echo/EchoVoiceSession.tsx`, `app/api/agents/echo/voice/route.ts`, chat in streaming, thread, strumenti di Echo.
