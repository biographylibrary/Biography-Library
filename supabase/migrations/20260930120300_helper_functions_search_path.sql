/*
  # Le sei funzioni di elenco costante fissano il proprio search_path

  Il controllo di sicurezza di Supabase (`function_search_path_mutable`) segnala le
  funzioni senza `search_path` fissato: chi le chiama può cambiare il percorso di
  ricerca della propria sessione e far risolvere un nome a un oggetto diverso da
  quello voluto. Le sei funzioni create dalle migrazioni 20260930120000 e
  20260930120150 restituiscono soltanto valori costanti, quindi il rischio concreto
  è nullo, ma l'avviso resta acceso, e un avviso che resta acceso abitua a ignorarli
  tutti.

    author_text_writable_statuses()      elenco degli stati in cui l'autore scrive testo
    biographies_author_text_columns()    colonne di testo protette di `biographies`
    biographies_server_owned_columns()   colonne di `biographies` riservate al server
    biographies_insert_defaults()        valori attesi all'inserimento in `biographies`
    profiles_server_owned_columns()      colonne di `profiles` riservate al server
    profiles_insert_defaults()           valori attesi all'inserimento in `profiles`

  ## Perché un percorso vuoto non le rompe
  I corpi sono `SELECT ARRAY[...]::text[]` e `SELECT jsonb_build_object(...)`: usano
  solo il tipo `text`, il costruttore di array e `jsonb_build_object`, che stanno in
  `pg_catalog`, e `pg_catalog` è sempre nel percorso di ricerca anche quando
  `search_path` è vuoto. Nessuna legge una tabella, un tipo o un'altra funzione di
  `public`. I test del banco lo dimostrano eseguendole con il percorso vuoto e con
  un controllo negativo (una funzione che nomina un'altra senza schema, in questo
  stato, non la trova).

  ## Che cosa non cambia
  Solo la configurazione delle sei funzioni. Corpo, volatilità, proprietario e
  permessi di esecuzione restano quelli di prima (ALTER FUNCTION ... SET non tocca
  l'elenco dei privilegi). Nessuna tabella, nessun dato, nessuna policy.

  ## Fuori da questa migrazione
  Sei altre funzioni restano segnalate: `biographies_um_id_immutable`,
  `biographies_sync_published_um`, `biographies_require_rights_for_public`,
  `enforce_one_biography_per_user`, `handle_biography_published`,
  `reset_biography_engagement_email_flags`. Esistevano già in produzione così (la
  migrazione 20260930115900 le ha riprodotte identiche). I loro corpi qualificano
  già i nomi che usano (`public.biographies`, `public.get_my_role()`), quindi lo
  stesso ALTER funzionerebbe anche per loro; non le tocco qui perché sono i trigger
  che scattano a ogni scrittura su `biographies` e la decisione è separata.
*/

ALTER FUNCTION public.author_text_writable_statuses() SET search_path = '';
ALTER FUNCTION public.biographies_author_text_columns() SET search_path = '';
ALTER FUNCTION public.biographies_server_owned_columns() SET search_path = '';
ALTER FUNCTION public.biographies_insert_defaults() SET search_path = '';
ALTER FUNCTION public.profiles_server_owned_columns() SET search_path = '';
ALTER FUNCTION public.profiles_insert_defaults() SET search_path = '';
