import { redirect } from 'next/navigation';

/** Legacy route — Echo hub lives on dashboard (bubble) and in the editor. */
export default function EchoLegacyRedirectPage() {
  redirect('/dashboard');
}
