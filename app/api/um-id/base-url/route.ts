import { NextResponse } from 'next/server';
import { umIdBaseUrl } from '@/lib/um-id-url';

/**
 * Espone l'indirizzo canonico di risoluzione a chi genera documenti nel
 * browser (export di testo e PDF scaricati dall'autore).
 *
 * Esiste perché `UM_ID_BASE_URL` è deliberatamente senza prefisso
 * `NEXT_PUBLIC_`: non viene incorporata nel pacchetto al build, così cambiarla
 * costa un riavvio invece di una nuova immagine. Il valore non è un segreto,
 * è l'indirizzo pubblico stampato dentro i documenti stessi.
 *
 * Se la variabile manca risponde 500: meglio un export che non parte di un
 * documento depositato con l'indirizzo sbagliato.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ baseUrl: umIdBaseUrl() });
  } catch (error) {
    console.error('[um-id/base-url]', error);
    return NextResponse.json({ error: 'um_id_base_url_not_configured' }, { status: 500 });
  }
}
