# Dump di migrazione Supabase — conservazione e ripristino

I dump contengono account, biografie e metadati Storage: **dati personali**. Non entrano mai nel repository Git.

## Dove stanno in locale

| Percorso | Contenuto |
|----------|-----------|
| `var/migrate-dumps/` | Directory di lavoro locale (elencata in `.gitignore`) |
| `var/migrate-dumps/YYYYMMDD-HHMM-irlanda/` | Un run di dump (schema, dati, elenco oggetti Storage) |

Crea la cartella del run **prima** di generare file:

```bash
mkdir -p var/migrate-dumps/$(date -u +%Y%m%d-%H%M)-irlanda
```

## Cosa non versionare

- Qualsiasi `.sql`, `.dump`, `.tar`, `.age`, `.gpg` sotto `var/migrate-dumps/`
- Export Auth che includano secret (hook secret, chiavi)
- Elenchi utenti con email in file di report esterni al dump cifrato

Il file `var/migrate-dumps/.gitkeep` può restare vuoto; la cartella resta ignorata dal contenuto reale perché `/var/migrate-dumps/` è in `.gitignore`.

## Conservazione cifrata su spazio svizzero

Dopo ogni dump completo (pre-cutover e post-cutover):

1. Archiviare la cartella del run in un tarball.
2. Cifrarla (es. `age` con chiave dell’associazione, o `gpg` simmetrico con passphrase in password manager).
3. Caricare **solo** l’archivio cifrato su spazio Infomaniak in Svizzera (Swiss Backup o Object Storage del progetto), in un prefisso dedicato, es. `bl-migrate/supabase-dumps/`.
4. Annotare in un registro operativo **fuori dal repo** (o in password manager): data, project ref origine, checksum SHA-256 del file cifrato, dove sta la chiave/passphrase.

Esempio locale (adattare chiavi e destinazione):

```bash
RUN=var/migrate-dumps/20261020-1400-irlanda
tar -C var/migrate-dumps -czf /tmp/bl-dump.tar.gz "$(basename "$RUN")"
age -r "$AGE_RECIPIENT" -o "/tmp/bl-dump.tar.gz.age" /tmp/bl-dump.tar.gz
# poi upload su Infomaniak; cancellare /tmp/bl-dump.tar.gz
shasum -a 256 "/tmp/bl-dump.tar.gz.age"
```

## Come ripristinare

1. Scaricare l’archivio cifrato da Infomaniak.
2. Decifrare → estrarre in `var/migrate-dumps/restore-…/`.
3. Seguire `scripts/migrate/README.md` (restore Postgres / Storage) verso il progetto destinazione.
4. Non lasciare dump in chiaro su laptop oltre il tempo necessario; dopo il restore riuscito, cancellare la copia in chiaro locale.

## Relazione col piano Zurich

Vedi `.cursor/plans/supabase-zurich-migrate.plan.md`. Gli stessi dump e la stessa procedura servono al trasloco successivo verso Infomaniak.
