#!/bin/bash
# Aggiorna la sezione "ultimi commit" in PROGETTO.md.
# Uso: ./scripts/update-project-doc.sh
# Eseguire dopo ogni sessione significativa per tenere il documento allineato.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOC="$ROOT/PROGETTO.md"

if [ ! -f "$DOC" ]; then
  echo "PROGETTO.md non trovato in $ROOT"
  exit 1
fi

# Genera blocco ultimi 20 commit
COMMITS=$(git -C "$ROOT" log --oneline -20)

# Genera lista piani con stato
PLANS=$(find "$ROOT/.cursor/plans" -name "*.plan.md" -o -name "*.md" 2>/dev/null | while read f; do
  name=$(basename "$f")
  # Cerca le righe status: completed nel file
  completed=$(grep -c "status: completed" "$f" 2>/dev/null || echo 0)
  total=$(grep -c "status:" "$f" 2>/dev/null || echo 0)
  echo "  - $name ($completed/$total step completati)"
done)

# Data aggiornamento
TODAY=$(date +"%d %B %Y")

# Sostituisce la riga "Ultimo aggiornamento:" alla fine del file
sed -i '' "s/^\*Ultimo aggiornamento:.*/*Ultimo aggiornamento: $TODAY*/" "$DOC"

echo ""
echo "PROGETTO.md aggiornato — riga 'Ultimo aggiornamento' impostata a $TODAY"
echo ""
echo "Ultimi 20 commit:"
echo "$COMMITS"
echo ""
echo "Piani trovati:"
echo "$PLANS"
echo ""
echo "--- AZIONE MANUALE RICHIESTA ---"
echo "Se in questa sessione hai:"
echo "  - Completato funzionalità significative → aggiorna la sezione 'Funzionalità completate'"
echo "  - Preso decisioni architetturali → aggiorna 'Decisioni architetturali fisse'"
echo "  - Aggiunto/completato piani → aggiorna 'Piani in corso o aperti'"
echo "  - Aggiunto variabili d'ambiente → aggiorna 'Variabili d'ambiente critiche'"
echo ""
echo "Poi fai: git add PROGETTO.md && git commit -m 'docs: aggiorna PROGETTO.md'"
