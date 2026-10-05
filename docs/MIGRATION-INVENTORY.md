# Inventario delle migrazioni: storia di produzione e repository

*Stato al 1 ottobre 2026. Letto dalla tabella `supabase_migrations.schema_migrations` del progetto `gckmusbozgbclokvbnwx` (94 voci) e da `supabase/migrations/` (110 file).*

**Per chi migrerà a Infomaniak: la storia delle migrazioni di produzione non si può rigiocare così com'è.** Non coincide con i file del repository, per nome, per versione, per ordine e per presenza. Quello che fa fede è lo **schema** che oggi c'è in produzione (un `pg_dump --schema-only` del progetto, più i dati), non la storia. I file servono da documentazione e da ordine di lettura, non da script di ricostruzione.

## 1. Che cosa non coincide

| Confronto | Numero |
|---|---|
| Voci nella storia di produzione | 94 |
| con lo stesso nome e la stessa versione di un file | 67 |
| con lo stesso nome ma **versione diversa** da quella del file | 24 |
| senza nessun file con quel nome | 3 |
| File senza voce omonima in produzione | 19 (7 sono le migrazioni del blocco 1, non ancora applicate quando si è scritto questo inventario; le altre 12 sono storiche: 11 senza voce e 1 rinominata) |

**Perché le versioni differiscono.** Lo strumento con cui si applicano le migrazioni a Supabase (`apply_migration`) accetta solo un nome e registra come versione l'istante in cui gira, non il prefisso del file. I file sono stati numerati prima, all'atto della scrittura. Dal blocco 1 (30 settembre 2026) la regola è un'altra: dopo ogni applicazione si riallinea la versione a quella del file (vedi `DEPLOYMENT.md`, "Applicare una migrazione"). Le discordanze storiche qui sotto **non sono state toccate**.

## 2. Le 24 migrazioni con versione diversa

| Nome | Versione nel file | Versione registrata in produzione |
|---|---|---|
| `publication_flow_phase_statuses` | `20260403140000` | `20260403191329` |
| `add_final_pdf_and_listing_cover_urls` | `20260403190000` | `20260403191337` |
| `share_token_rpc_listing_cover` | `20260403210000` | `20260403191355` |
| `add_draft_ai_feedback_to_biographies` | `20260508` | `20260617231445` |
| `biography_media_cover_a5_layout` | `20260508120000` | `20260617231455` |
| `biography_book_structure_author_copyright_page` | `20260508180000` | `20260617231458` |
| `agent_tables` | `20260618120000` | `20260622175748` |
| `account_status_profiles_rls` | `20260404120000` | `20260622230919` |
| `profiles_onboarding` | `20260618120000` | `20260624103603` |
| `echo_agent_type` | `20260623120000` | `20260624104916` |
| `biography_limits_and_chapter_publish_trigger` | `20260618120000` | `20260624183326` |
| `email_idempotency_columns` | `20260619120000` | `20260624225530` |
| `biography_media_gallery_limit_30` | `20260625120000` | `20260625005649` |
| `handle_new_user_copy_signup_language` | `20260625120000` | `20260625085642` |
| `registration_language_locked` | `20260625140000` | `20260625091138` |
| `biographies_subject_name` | `20260625160000` | `20260625101308` |
| `reviewer_biographies_update_rls` | `20260625140000` | `20260625152706` |
| `biography_view_translations` | `20260625120000` | `20260625222414` |
| `staff_bypass_chapter_publish_cooldown` | `20260626140000` | `20260626134809` |
| `um_identifier_registry` | `20260904090000` | `20260904095205` |
| `biographies_record_identity_rights` | `20260904090100` | `20260904095311` |
| `person_events` | `20260904090200` | `20260904095341` |
| `biography_flat_view` | `20260904090400` | `20260904095346` |
| `backfill_public_default_license` | `20260904160000` | `20260904140828` |

## 3. Le 11 migrazioni senza voce nella storia

Furono applicate senza passare dalla storia, probabilmente dall'editor SQL della dashboard. Gli effetti di otto su undici sono verificati in produzione il 1 ottobre 2026 (colonne `onboarding_wizard_step`, `content_html_legacy`, `is_pioneer`, `provisional_until`, `author_revision_requested_at`, `appeal_status`, vincolo `waitlist` su `account_status`, tabella `archive_package_versions`). Non sono stati verificati i tre che lasciano solo commenti o riempimenti di dati (`person_events_place_wgs84_comments`, `memorial_provisional_backfill`) o vincoli (`archive_reason_data_protection`, `reports_lane_visibility`): chi migra li confronti con lo schema.

| File | Che cosa fa |
|---|---|
| `20260625150000_onboarding_wizard_mandatory` | colonne dell'onboarding obbligatorio |
| `20260921120000_person_events_place_wgs84_comments` | commenti sulle colonne dei luoghi |
| `20260921140000_waitlist_account_status` | stato `waitlist` dell'account |
| `20260921233000_biographies_content_html_legacy` | colonna `content_html_legacy` |
| `20260924130000_archive_package` | pacchetto d'archivio |
| `20260924150000_archive_reason_data_protection` | motivo di protezione dei dati |
| `20260924170000_reports_schema` | schema delle segnalazioni |
| `20260924180000_reports_lane_visibility` | visibilità per corsia delle segnalazioni |
| `20260924190000_report_deadlines` | scadenze delle segnalazioni |
| `20260924200000_memorial_provisional_backfill` | recupero del periodo provvisorio dei memoriali |
| `20260925233000_biography_pioneer` | badge Pioniere |

Più due casi di nome diverso, non di assenza: il file `20260904090300_person_relations` corrisponde alla voce `20260904095407 person_relations_table`; le voci `create_regenerate_revoke_share_token_rpcs` (20260331212606) e `drop_is_locked_column_from_biographies` (20260401132832) non hanno un file omonimo (le due funzioni dei link di condivisione mancavano del tutto dal repository finché non le ha riprodotte `20260930115900_align_biographies_profiles_triggers`).

## 4. Altri difetti del repository

**Versioni duplicate nei file**: tre versioni sono condivise da più file, e `supabase db push` le rifiuterebbe (la versione è una chiave unica). `20260618120000` (`agent_tables`, `biography_limits_and_chapter_publish_trigger`, `profiles_onboarding`), `20260625120000` (`biography_media_gallery_limit_30`, `biography_view_translations`, `handle_new_user_copy_signup_language`), `20260625140000` (`registration_language_locked`, `reviewer_biographies_update_rls`). Le migrazioni del blocco 1 hanno tutte versioni distinte: un test lo verifica.

**Ordine**: fra le 24 migrazioni con versione diversa, 14 coppie sono state applicate in produzione in un ordine diverso da quello alfabetico dei file (per esempio `agent_tables` prima di `account_status_profiles_rls` in produzione, il contrario nei file). Non risulta che questo abbia creato problemi, ma chi rigioca i file in ordine di nome non ottiene necessariamente lo stesso schema.

## 5. Che cosa fare migrando

1. Partire da uno **schema di produzione esportato** (non dai file) e dai dati.
2. Confrontare il catalogo ottenuto con quello di produzione con la stessa interrogazione che usa la prova a secco (`scripts/build-dry-run.mjs`, costante `CATALOG_SQL`): trigger, policy, funzioni (con l'impronta del sorgente), tabelle, vincoli, indici, privilegi.
3. Sapere che il banco di prova dei test (`lib/server/__tests__/db/`) è un sottoinsieme fedele delle tabelle che le migrazioni recenti toccano, non una copia dello schema: gira su PostgreSQL 18, mentre la produzione è PostgreSQL 17.6 (il catalogo dei vincoli NOT NULL è diverso).
4. Le funzioni `SECURITY DEFINER` eseguibili da anon o authenticated vanno riesaminate a ogni migrazione (elenco in `docs/SICUREZZA-SCRITTURE-ELENCO.md`, punto 3).

## 6. Le otto migrazioni del blocco 1

Registrate con la regola nuova (applicazione e allineamento della versione nello stesso passaggio). Tutte e otto applicate in produzione il 1 ottobre 2026; la storia passa da 94 a 102 voci e le otto hanno come versione il prefisso del proprio file.

| File | Quando | Stato |
|---|---|---|
| `20260930115700_publication_records` | prima del deploy | applicata il 1 ottobre 2026 (versione registrata 20260930222917, riallineata a 20260930115700) |
| `20260930115800_ai_token_usage` | prima del deploy | applicata il 1 ottobre 2026 (versione registrata 20260930223004, riallineata a 20260930115800) |
| `20260930115900_align_biographies_profiles_triggers` | dopo il deploy | applicata il 1 ottobre 2026 (versione registrata 20260930225236, riallineata a 20260930115900) |
| `20260930120000_server_only_columns_and_reports` | dopo il deploy | applicata il 1 ottobre 2026 (versione registrata 20260930225336, riallineata a 20260930120000) |
| `20260930120100_drop_biography_view_translations` | dopo il deploy | applicata il 1 ottobre 2026 (versione registrata 20260930225411, riallineata a 20260930120100) |
| `20260930120150_author_text_whitelist` | dopo il deploy | applicata il 1 ottobre 2026 (versione registrata 20260930225453, riallineata a 20260930120150) |
| `20260930120200_agent_threads_echo_only` | dopo il deploy | applicata il 1 ottobre 2026 (versione registrata 20260930225519, riallineata a 20260930120200) |
| `20260930120300_helper_functions_search_path` | dopo il deploy | applicata il 1 ottobre 2026 (versione registrata 20260930231549, riallineata a 20260930120300) |

## 7. Migrazioni successive al blocco 1

Stessa regola: applicazione e allineamento della versione nello stesso passaggio, dopo conferma.

| File | Stato |
|---|---|
| `20261006090000_biography_media_gallery_limit_15` | da applicare: porta a 15 il limite di foto di galleria nel controllo del database (prima 30); nessuna biografia in produzione supera 10 foto di galleria (controllato il 6 ottobre 2026) |
