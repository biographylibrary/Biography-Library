import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Due unioni a pochi secondi di distanza facevano partire due deploy insieme sullo stesso nodo, e
 * il secondo falliva con «container name /bl-app is already in use» (5 ottobre 2026, deploy #94).
 * Il gruppo di concorrenza li mette in coda. `cancel-in-progress` deve restare falso: interrompere
 * un deploy fra `docker stop` e `docker run` lascerebbe l'app spenta.
 */
const workflow = readFileSync(join(process.cwd(), '.github', 'workflows', 'deploy.yml'), 'utf8');

describe('workflow di deploy su Jelastic', () => {
  it('mette i deploy in coda con un gruppo di concorrenza, senza interrompere quello in corso', () => {
    expect(workflow).toMatch(/^concurrency:\s*\n\s+group:\s*deploy-jelastic\s*\n\s+cancel-in-progress:\s*false\s*$/m);
    expect(workflow).not.toMatch(/cancel-in-progress:\s*true/);
  });
});
