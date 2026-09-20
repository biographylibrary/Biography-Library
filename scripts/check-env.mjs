#!/usr/bin/env node
/**
 * Verifica che ogni variabile d'ambiente letta dal codice sia documentata in
 * `.env.example`, e viceversa. Il codice è la fonte di verità, non il file.
 *
 * Il progetto ha due ambienti di esecuzione con due meccanismi diversi:
 *   - Next.js su Jelastic legge `process.env.X` (file .env passato a Docker);
 *   - le Edge Functions girano su Deno e leggono `Deno.env.get('X')`
 *     (segreti impostati nel progetto Supabase, non in un file).
 * Entrambi finiscono nello stesso elenco documentato, perché il costo di
 * dimenticarne una è identico: un guasto silenzioso in produzione.
 *
 * Uso: npm run check:env
 * Esce con 1 se qualcosa non torna, elencando le chiavi e cosa farne.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

/** Cartelle scandite alla ricerca di letture di variabili. */
const SCAN_DIRS = ['app', 'lib', 'components', 'shared', 'scripts', 'supabase/functions'];
const SCAN_FILES = ['middleware.ts', 'next.config.js'];
const SCAN_EXT = ['.ts', '.tsx', '.mjs', '.js'];
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', '__tests__']);
/** Questo script cita i due schemi di lettura nei propri commenti. */
const SKIP_FILES = new Set(['scripts/check-env.mjs']);

/**
 * Fornite dal sistema o dal runtime: non vanno documentate né impostate.
 * SUPABASE_* compaiono qui solo per le Edge Functions, dove Supabase le inietta
 * da sé; sul lato Next.js sono chiavi vere e restano nell'elenco documentato.
 */
const PROVIDED_BY_RUNTIME = new Set(['NODE_ENV', 'HOME', 'PATH', 'CI', 'npm_package_version']);

/**
 * Letture indirette: qui i nomi delle variabili sono stringhe in una mappa e
 * `process.env[...]` le risolve a runtime, quindi la ricerca testuale non le
 * vede. Se nasce un altro punto così, va aggiunto qui, altrimenti il controllo
 * segnala le sue chiavi come documentate ma non usate.
 */
const DYNAMIC_LOOKUP_FILES = ['lib/agents/models.ts'];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SCAN_EXT.some((ext) => entry.endsWith(ext))) out.push(full);
  }
  return out;
}

/** Ogni chiave trovata nel codice, con i file che la leggono. */
function collectUsed() {
  const files = [
    ...SCAN_DIRS.flatMap((d) => walk(join(ROOT, d))),
    ...SCAN_FILES.map((f) => join(ROOT, f)),
  ];
  const used = new Map();
  const note = (key, file) => {
    if (PROVIDED_BY_RUNTIME.has(key)) return;
    if (!used.has(key)) used.set(key, new Set());
    used.get(key).add(relative(ROOT, file));
  };

  for (const file of files) {
    if (SKIP_FILES.has(relative(ROOT, file))) continue;
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const m of text.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) note(m[1], file);
    for (const m of text.matchAll(/process\.env\[['"]([A-Z][A-Z0-9_]*)['"]\]/g)) note(m[1], file);
    for (const m of text.matchAll(/Deno\.env\.get\(['"]([A-Z][A-Z0-9_]*)['"]\)/g)) note(m[1], file);
    if (DYNAMIC_LOOKUP_FILES.includes(relative(ROOT, file))) {
      for (const m of text.matchAll(/['"]((?:AGENT|ECHO|INFOMANIAK|NEXT_PUBLIC)_[A-Z0-9_]+)['"]/g)) {
        note(m[1], file);
      }
    }
  }
  return used;
}

/** Ogni chiave elencata in .env.example, attiva o commentata. */
function collectDocumented() {
  const text = readFileSync(join(ROOT, '.env.example'), 'utf8');
  const keys = new Set();
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*#?\s*([A-Z][A-Z0-9_]{2,})\s*(=|—|-)/);
    if (m) keys.add(m[1]);
  }
  return keys;
}

const used = collectUsed();
const documented = collectDocumented();

const undocumented = [...used.keys()].filter((k) => !documented.has(k)).sort();
const unused = [...documented].filter((k) => !used.has(k)).sort();

if (undocumented.length === 0 && unused.length === 0) {
  console.log(`check:env — ${used.size} variabili, tutte documentate in .env.example.`);
  process.exit(0);
}

if (undocumented.length > 0) {
  console.error('\nLette dal codice ma assenti da .env.example:\n');
  for (const key of undocumented) {
    console.error(`  ${key}\n      letta in: ${[...used.get(key)].slice(0, 3).join(', ')}`);
  }
  console.error(
    '\n  Aggiungile a .env.example, commentate se facoltative.\n' +
      '  Poi impostale dove servono: .env.local, /opt/bl-app/.env su Jelastic,\n' +
      '  e i segreti Supabase se le legge una Edge Function.\n'
  );
}

if (unused.length > 0) {
  console.error('\nDocumentate in .env.example ma lette da nessuna parte:\n');
  for (const key of unused) console.error(`  ${key}`);
  console.error(
    '\n  Toglile da .env.example, oppure, se sono lette in modo indiretto,\n' +
      '  aggiungi il file che le risolve a DYNAMIC_LOOKUP_FILES in questo script.\n'
  );
}

process.exit(1);
