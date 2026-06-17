# Cursor — biography-library

Configurazione per lavorare con Cursor secondo la guida vibe coding del progetto.

## Struttura

| Cartella | Contenuto |
|----------|-----------|
| `rules/` | Regole persistenti (`.mdc`) — caricate automaticamente |
| `commands/` | Comandi slash: `/commit-push-pr`, `/review-code`, `/fix-issue`, `/verify-build`, `/pre-release` |
| `agents/` | Agenti delegati: `code-simplifier`, `security-reviewer`, `verify-app` |
| `skills/` | Conoscenza di dominio: `supabase-migrations`, `pdf-export` |
| `plans/` | Piani salvati (es. lavoro WIP corrente) |

## Documenti correlati

- [`PRD.md`](../PRD.md) — requisiti prodotto
- [`SPEC.md`](../SPEC.md) — stato funzionale e WIP
- [`docs/DESIGN.md`](../docs/DESIGN.md) — design system

## Note

- Env locale: **`.env.local`** (da `.env.example`), mai committare
- Branch deploy: **`main`** · lavoro quotidiano spesso su **`main-sync`**
- Verifica: `npm run typecheck` + `lint` + `build` (no `npm test`)

I vecchi file memory bank (`.cursor:rules/mcp.json/...`) sono stati sostituiti da questa struttura e da `PRD.md` / `SPEC.md`.
