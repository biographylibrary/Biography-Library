import { resolveSiteName, resolveSiteUrl } from './locale';
import type { EmailLocale, EmailTemplateId, EmailTemplateVars, RenderedEmail } from './types';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function link(href: string, label: string): string {
  return `<a href="${esc(href)}" style="color:#2d5016;font-weight:600;">${esc(label)}</a>`;
}

export function wrapEmailHtml(params: {
  siteName: string;
  siteUrl: string;
  locale: EmailLocale;
  bodyHtml: string;
}): string {
  const { siteName, siteUrl, locale, bodyHtml } = params;
  const footerByLocale: Record<EmailLocale, string> = {
    en: 'Hosted in Switzerland',
    it: 'Ospitato in Svizzera',
    fr: 'Hébergé en Suisse',
    de: 'Gehostet in der Schweiz',
  };
  return `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,'Times New Roman',serif;color:#121212;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e8e0d4;border-radius:12px;padding:32px 28px;">
        <tr><td>
          <p style="margin:0 0 24px;font-size:22px;font-weight:600;color:#2d5016;">${esc(siteName)}</p>
          ${bodyHtml}
          <hr style="border:none;border-top:1px solid #e8e0d4;margin:28px 0 16px;">
          <p style="margin:0;font-size:12px;color:#666;line-height:1.5;">
            ${esc(footerByLocale[locale])}<br>
            <a href="${esc(siteUrl)}" style="color:#666;">${esc(siteUrl.replace(/^https?:\/\//, ''))}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

type InnerContent = { subject: string; paragraphs: string[] };

function inner(
  locale: EmailLocale,
  map: Record<EmailLocale, InnerContent>,
): InnerContent {
  return map[locale] ?? map.en;
}

function varsWithDefaults(
  vars: EmailTemplateVars,
  siteName: string,
  siteUrl: string,
): Record<string, string> {
  return {
    siteName,
    siteUrl,
    dashboardUrl: `${siteUrl}/dashboard`,
    echoUrl: `${siteUrl}/echo`,
    loginUrl: `${siteUrl}/`,
    contactsUrl: 'https://biographylibrary.org/contacts',
    biographyTitle: String(vars.biographyTitle ?? ''),
    reviewerMessage: String(vars.reviewerMessage ?? ''),
    availableDate: String(vars.availableDate ?? ''),
    draftIteration: String(vars.draftIteration ?? '1'),
    editorUrl: String(vars.editorUrl ?? `${siteUrl}/dashboard`),
    confirmUrl: String(vars.confirmUrl ?? siteUrl),
    ...Object.fromEntries(
      Object.entries(vars).map(([k, v]) => [k, v == null ? '' : String(v)]),
    ),
  };
}

function renderParagraphs(paragraphs: string[], v: Record<string, string>): string {
  return paragraphs
    .map((p) => {
      let text = p;
      for (const [key, val] of Object.entries(v)) {
        text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
      }
      if (text.startsWith('LINK:')) {
        const rest = text.slice(5);
        const pipe = rest.indexOf('|');
        const href = pipe >= 0 ? rest.slice(0, pipe) : rest;
        const label = pipe >= 0 ? rest.slice(pipe + 1) : rest;
        return `<p style="margin:0 0 16px;line-height:1.6;">${link(href, label)}</p>`;
      }
      if (text.startsWith('HTML:')) {
        return `<p style="margin:0 0 16px;line-height:1.6;">${text.slice(5)}</p>`;
      }
      return `<p style="margin:0 0 16px;line-height:1.6;">${text}</p>`;
    })
    .join('');
}

export function renderEmailTemplate(params: {
  templateId: EmailTemplateId;
  locale: EmailLocale;
  vars?: EmailTemplateVars;
  siteName?: string;
  siteUrl?: string;
}): RenderedEmail {
  const siteName = resolveSiteName(params.siteName);
  const siteUrl = resolveSiteUrl(params.siteUrl);
  const v = varsWithDefaults(params.vars ?? {}, siteName, siteUrl);
  const content = getTemplateInner(params.templateId, params.locale, v);
  const bodyHtml = renderParagraphs(content.paragraphs, v);
  return {
    subject: content.subject.replace(/\{siteName\}/g, siteName),
    html: wrapEmailHtml({
      siteName,
      siteUrl,
      locale: params.locale,
      bodyHtml,
    }),
  };
}

function getTemplateInner(
  templateId: EmailTemplateId,
  locale: EmailLocale,
  v: Record<string, string>,
): InnerContent {
  switch (templateId) {
    case 'auth_confirm_signup':
      return inner(locale, {
        en: {
          subject: '{siteName} — Confirm your email',
          paragraphs: [
            'Hello,',
            'Thank you for signing up. Please confirm your email address to activate your account.',
            `LINK:${v.confirmUrl}|Confirm email address`,
            'If you did not create an account, you can ignore this message.',
          ],
        },
        it: {
          subject: '{siteName} — Conferma la tua email',
          paragraphs: [
            'Ciao,',
            'Grazie per esserti registrato. Conferma il tuo indirizzo email per attivare l\'account.',
            `LINK:${v.confirmUrl}|Conferma indirizzo email`,
            'Se non hai creato un account, ignora questo messaggio.',
          ],
        },
        fr: {
          subject: '{siteName} — Confirmez votre email',
          paragraphs: [
            'Bonjour,',
            'Merci pour votre inscription. Veuillez confirmer votre adresse email pour activer votre compte.',
            `LINK:${v.confirmUrl}|Confirmer l'adresse email`,
            'Si vous n\'avez pas créé de compte, ignorez ce message.',
          ],
        },
        de: {
          subject: '{siteName} — E-Mail bestätigen',
          paragraphs: [
            'Hallo,',
            'Vielen Dank für Ihre Registrierung. Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihr Konto zu aktivieren.',
            `LINK:${v.confirmUrl}|E-Mail-Adresse bestätigen`,
            'Wenn Sie kein Konto erstellt haben, ignorieren Sie diese Nachricht.',
          ],
        },
      });
    case 'auth_reset_password':
      return inner(locale, {
        en: {
          subject: '{siteName} — Reset your password',
          paragraphs: [
            'Hello,',
            'We received a request to reset your password.',
            `LINK:${v.confirmUrl}|Reset password`,
            'If you did not request this, you can ignore this email.',
          ],
        },
        it: {
          subject: '{siteName} — Reimposta la password',
          paragraphs: [
            'Ciao,',
            'Abbiamo ricevuto una richiesta di reimpostazione password.',
            `LINK:${v.confirmUrl}|Reimposta password`,
            'Se non l\'hai richiesto tu, ignora questa email.',
          ],
        },
        fr: {
          subject: '{siteName} — Réinitialiser votre mot de passe',
          paragraphs: [
            'Bonjour,',
            'Nous avons reçu une demande de réinitialisation de mot de passe.',
            `LINK:${v.confirmUrl}|Réinitialiser le mot de passe`,
            'Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet email.',
          ],
        },
        de: {
          subject: '{siteName} — Passwort zurücksetzen',
          paragraphs: [
            'Hallo,',
            'Wir haben eine Anfrage zum Zurücksetzen Ihres Passworts erhalten.',
            `LINK:${v.confirmUrl}|Passwort zurücksetzen`,
            'Wenn Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail.',
          ],
        },
      });
    case 'auth_email_change':
      return inner(locale, {
        en: {
          subject: '{siteName} — Confirm email change',
          paragraphs: ['Hello,', 'Please confirm your new email address.', `LINK:${v.confirmUrl}|Confirm new email`],
        },
        it: {
          subject: '{siteName} — Conferma cambio email',
          paragraphs: ['Ciao,', 'Conferma il tuo nuovo indirizzo email.', `LINK:${v.confirmUrl}|Conferma nuova email`],
        },
        fr: {
          subject: '{siteName} — Confirmer le changement d\'email',
          paragraphs: ['Bonjour,', 'Veuillez confirmer votre nouvelle adresse email.', `LINK:${v.confirmUrl}|Confirmer le nouvel email`],
        },
        de: {
          subject: '{siteName} — E-Mail-Änderung bestätigen',
          paragraphs: ['Hallo,', 'Bitte bestätigen Sie Ihre neue E-Mail-Adresse.', `LINK:${v.confirmUrl}|Neue E-Mail bestätigen`],
        },
      });
    case 'welcome':
      return inner(locale, {
        en: {
          subject: '{siteName} — Welcome! Here is how to get started',
          paragraphs: [
            'Hello,',
            'Welcome to Biography Library — a permanent, non-profit digital archive hosted in Switzerland where you can preserve a life story.',
            'HTML:<strong>Getting started</strong><br>1. Open your dashboard and create your biography.<br>2. Choose your content language and writing mode (sections or free text).<br>3. Write with the editor or talk to <strong>Echo</strong>, your AI guide (voice or text).',
            'HTML:<strong>Privacy</strong><br>You choose visibility: public, link-only, family, or private.',
            'HTML:<strong>Publishing</strong><br>When your text is ready: final review → PDF draft (up to 3 rounds) → approval → automated screening → publication.',
            'HTML:<strong>Autobiography rules</strong><br>One biography per account. After the first published chapter, the next chapter unlocks after 365 days.',
            `LINK:${v.dashboardUrl}|Go to dashboard`,
            `LINK:${v.echoUrl}|Meet Echo`,
            `LINK:${v.contactsUrl}|Contact support`,
          ],
        },
        it: {
          subject: '{siteName} — Benvenuto! Ecco come iniziare',
          paragraphs: [
            'Ciao,',
            'Benvenuto in Biography Library — un archivio digitale permanente e non profit, ospitato in Svizzera, dove puoi preservare una storia di vita.',
            'HTML:<strong>Primi passi</strong><br>1. Apri la dashboard e crea la tua biografia.<br>2. Scegli la lingua del contenuto e la modalità di scrittura (sezioni o testo libero).<br>3. Scrivi con l\'editor o parla con <strong>Echo</strong>, la tua guida AI (voce o testo).',
            'HTML:<strong>Privacy</strong><br>Scegli tu la visibilità: pubblica, solo link, famiglia o privata.',
            'HTML:<strong>Pubblicazione</strong><br>Quando il testo è pronto: revisione finale → bozza PDF (fino a 3 round) → approvazione → screening → pubblicazione.',
            'HTML:<strong>Regole autobiografia</strong><br>Una biografia per account. Dopo il primo capitolo pubblicato, il successivo si sblocca dopo 365 giorni.',
            `LINK:${v.dashboardUrl}|Vai alla dashboard`,
            `LINK:${v.echoUrl}|Incontra Echo`,
            `LINK:${v.contactsUrl}|Contatta il supporto`,
          ],
        },
        fr: {
          subject: '{siteName} — Bienvenue ! Comment commencer',
          paragraphs: [
            'Bonjour,',
            'Bienvenue sur Biography Library — une archive numérique permanente et à but non lucratif, hébergée en Suisse, pour préserver une histoire de vie.',
            'HTML:<strong>Premiers pas</strong><br>1. Ouvrez votre tableau de bord et créez votre biographie.<br>2. Choisissez la langue du contenu et le mode d\'écriture (sections ou texte libre).<br>3. Écrivez avec l\'éditeur ou parlez à <strong>Echo</strong>, votre guide IA (voix ou texte).',
            'HTML:<strong>Confidentialité</strong><br>Vous choisissez la visibilité : publique, lien uniquement, famille ou privée.',
            'HTML:<strong>Publication</strong><br>Quand le texte est prêt : révision finale → brouillon PDF (jusqu\'à 3 tours) → approbation → contrôle → publication.',
            'HTML:<strong>Règles autobiographie</strong><br>Une biographie par compte. Après le premier chapitre publié, le suivant se débloque après 365 jours.',
            `LINK:${v.dashboardUrl}|Aller au tableau de bord`,
            `LINK:${v.echoUrl}|Rencontrer Echo`,
            `LINK:${v.contactsUrl}|Contacter le support`,
          ],
        },
        de: {
          subject: '{siteName} — Willkommen! So starten Sie',
          paragraphs: [
            'Hallo,',
            'Willkommen bei Biography Library — einem dauerhaften, gemeinnützigen digitalen Archiv in der Schweiz, in dem Sie eine Lebensgeschichte bewahren können.',
            'HTML:<strong>Erste Schritte</strong><br>1. Öffnen Sie Ihr Dashboard und erstellen Sie Ihre Biografie.<br>2. Wählen Sie die Inhaltssprache und den Schreibmodus (Abschnitte oder Freitext).<br>3. Schreiben Sie im Editor oder sprechen Sie mit <strong>Echo</strong>, Ihrem KI-Guide (Sprache oder Text).',
            'HTML:<strong>Datenschutz</strong><br>Sie wählen die Sichtbarkeit: öffentlich, nur Link, Familie oder privat.',
            'HTML:<strong>Veröffentlichung</strong><br>Wenn der Text bereit ist: Abschlussprüfung → PDF-Entwurf (bis zu 3 Runden) → Freigabe → Prüfung → Veröffentlichung.',
            'HTML:<strong>Autobiografie-Regeln</strong><br>Eine Biografie pro Konto. Nach dem ersten veröffentlichten Kapitel wird das nächste nach 365 Tagen freigeschaltet.',
            `LINK:${v.dashboardUrl}|Zum Dashboard`,
            `LINK:${v.echoUrl}|Echo kennenlernen`,
            `LINK:${v.contactsUrl}|Support kontaktieren`,
          ],
        },
      });
    case 'account_suspended':
      return inner(locale, {
        en: { subject: '{siteName} — Account suspended', paragraphs: ['Hello,', 'Your account has been <strong>suspended</strong>. You cannot access the platform at this time.', 'Reply to this email if you need more information.'] },
        it: { subject: '{siteName} — Account sospeso', paragraphs: ['Gentile utente,', 'Il tuo account è stato <strong>sospeso</strong>. Non è al momento possibile accedere alla piattaforma.', 'Per informazioni puoi rispondere a questa email.'] },
        fr: { subject: '{siteName} — Compte suspendu', paragraphs: ['Bonjour,', 'Votre compte a été <strong>suspendu</strong>. Vous ne pouvez pas accéder à la plateforme pour le moment.', 'Répondez à cet email pour plus d\'informations.'] },
        de: { subject: '{siteName} — Konto gesperrt', paragraphs: ['Hallo,', 'Ihr Konto wurde <strong>gesperrt</strong>. Sie können derzeit nicht auf die Plattform zugreifen.', 'Antworten Sie auf diese E-Mail für weitere Informationen.'] },
      });
    case 'account_reinstated':
      return inner(locale, {
        en: { subject: '{siteName} — Account reinstated', paragraphs: ['Hello,', 'Your account has been <strong>reinstated</strong>. You can access the platform again.', `LINK:${v.loginUrl}|Sign in`] },
        it: { subject: '{siteName} — Account riattivato', paragraphs: ['Gentile utente,', 'Il tuo account è stato <strong>riattivato</strong>. Puoi nuovamente accedere alla piattaforma.', `LINK:${v.loginUrl}|Accedi`] },
        fr: { subject: '{siteName} — Compte réactivé', paragraphs: ['Bonjour,', 'Votre compte a été <strong>réactivé</strong>. Vous pouvez à nouveau accéder à la plateforme.', `LINK:${v.loginUrl}|Se connecter`] },
        de: { subject: '{siteName} — Konto reaktiviert', paragraphs: ['Hallo,', 'Ihr Konto wurde <strong>reaktiviert</strong>. Sie können wieder auf die Plattform zugreifen.', `LINK:${v.loginUrl}|Anmelden`] },
      });
    case 'account_deleted':
      return inner(locale, {
        en: { subject: '{siteName} — Account deleted', paragraphs: ['Hello,', 'Your account has been <strong>deleted</strong>. You will no longer be able to sign in with these credentials.'] },
        it: { subject: '{siteName} — Account cancellato', paragraphs: ['Gentile utente,', 'Il tuo account è stato <strong>cancellato</strong>. Non sarà più possibile accedere con queste credenziali.'] },
        fr: { subject: '{siteName} — Compte supprimé', paragraphs: ['Bonjour,', 'Votre compte a été <strong>supprimé</strong>. Vous ne pourrez plus vous connecter avec ces identifiants.'] },
        de: { subject: '{siteName} — Konto gelöscht', paragraphs: ['Hallo,', 'Ihr Konto wurde <strong>gelöscht</strong>. Eine Anmeldung mit diesen Zugangsdaten ist nicht mehr möglich.'] },
      });
    case 'publication_under_review':
      return inner(locale, {
        en: { subject: '{siteName} — Biography sent for review', paragraphs: ['Hello,', 'Your biography "{biographyTitle}" has been submitted for human review. We will notify you of the outcome.', `LINK:${v.dashboardUrl}|View dashboard`] },
        it: { subject: '{siteName} — Biografia inviata in revisione', paragraphs: ['Ciao,', 'La tua biografia "{biographyTitle}" è stata inviata a revisione umana. Ti avviseremo dell\'esito.', `LINK:${v.dashboardUrl}|Vai alla dashboard`] },
        fr: { subject: '{siteName} — Biographie envoyée en révision', paragraphs: ['Bonjour,', 'Votre biographie « {biographyTitle} » a été envoyée pour révision humaine. Nous vous informerons du résultat.', `LINK:${v.dashboardUrl}|Voir le tableau de bord`] },
        de: { subject: '{siteName} — Biografie zur Prüfung eingereicht', paragraphs: ['Hallo,', 'Ihre Biografie „{biographyTitle}" wurde zur manuellen Prüfung eingereicht. Wir informieren Sie über das Ergebnis.', `LINK:${v.dashboardUrl}|Dashboard anzeigen`] },
      });
    case 'publication_auto_published':
      return inner(locale, {
        en: { subject: '{siteName} — Your biography is published', paragraphs: ['Hello,', 'Your biography "{biographyTitle}" passed automated review and is now published.', `LINK:${v.dashboardUrl}|View dashboard`] },
        it: { subject: '{siteName} — La tua biografia è pubblicata', paragraphs: ['Ciao,', 'La tua biografia "{biographyTitle}" ha superato la revisione automatica ed è ora pubblicata.', `LINK:${v.dashboardUrl}|Vai alla dashboard`] },
        fr: { subject: '{siteName} — Votre biographie est publiée', paragraphs: ['Bonjour,', 'Votre biographie « {biographyTitle} » a passé la révision automatique et est maintenant publiée.', `LINK:${v.dashboardUrl}|Voir le tableau de bord`] },
        de: { subject: '{siteName} — Ihre Biografie ist veröffentlicht', paragraphs: ['Hallo,', 'Ihre Biografie „{biographyTitle}" hat die automatische Prüfung bestanden und ist jetzt veröffentlicht.', `LINK:${v.dashboardUrl}|Dashboard anzeigen`] },
      });
    case 'publication_published':
      return inner(locale, {
        en: { subject: '{siteName} — Your biography is published', paragraphs: ['Hello,', 'Your biography "{biographyTitle}" has been reviewed and published.', `LINK:${v.dashboardUrl}|View dashboard`] },
        it: { subject: '{siteName} — La tua biografia è pubblicata', paragraphs: ['Ciao,', 'La tua biografia "{biographyTitle}" è stata revisionata e pubblicata.', `LINK:${v.dashboardUrl}|Vai alla dashboard`] },
        fr: { subject: '{siteName} — Votre biographie est publiée', paragraphs: ['Bonjour,', 'Votre biographie « {biographyTitle} » a été examinée et publiée.', `LINK:${v.dashboardUrl}|Voir le tableau de bord`] },
        de: { subject: '{siteName} — Ihre Biografie ist veröffentlicht', paragraphs: ['Hallo,', 'Ihre Biografie „{biographyTitle}" wurde geprüft und veröffentlicht.', `LINK:${v.dashboardUrl}|Dashboard anzeigen`] },
      });
    case 'publication_published_warning':
      return inner(locale, {
        en: { subject: '{siteName} — Biography published with notice', paragraphs: ['Hello,', 'Your biography "{biographyTitle}" has been published. Please review our content guidelines for future reference.', `LINK:${v.dashboardUrl}|View dashboard`] },
        it: { subject: '{siteName} — Biografia pubblicata con avviso', paragraphs: ['Ciao,', 'La tua biografia "{biographyTitle}" è stata pubblicata. Ti invitiamo a rivedere le nostre linee guida.', `LINK:${v.dashboardUrl}|Vai alla dashboard`] },
        fr: { subject: '{siteName} — Biographie publiée avec avertissement', paragraphs: ['Bonjour,', 'Votre biographie « {biographyTitle} » a été publiée. Veuillez consulter nos directives de contenu.', `LINK:${v.dashboardUrl}|Voir le tableau de bord`] },
        de: { subject: '{siteName} — Biografie mit Hinweis veröffentlicht', paragraphs: ['Hallo,', 'Ihre Biografie „{biographyTitle}" wurde veröffentlicht. Bitte lesen Sie unsere Inhaltsrichtlinien.', `LINK:${v.dashboardUrl}|Dashboard anzeigen`] },
      });
    case 'publication_returned':
      return inner(locale, {
        en: { subject: '{siteName} — Biography returned for edits', paragraphs: ['Hello,', 'Your biography "{biographyTitle}" needs changes before it can be published.', v.reviewerMessage ? `HTML:<strong>Reviewer note:</strong> ${esc(v.reviewerMessage)}` : '', `LINK:${v.editorUrl}|Open editor`] },
        it: { subject: '{siteName} — Biografia restituita per modifiche', paragraphs: ['Ciao,', 'La tua biografia "{biographyTitle}" richiede modifiche prima della pubblicazione.', v.reviewerMessage ? `HTML:<strong>Nota del revisore:</strong> ${esc(v.reviewerMessage)}` : '', `LINK:${v.editorUrl}|Apri editor`] },
        fr: { subject: '{siteName} — Biographie renvoyée pour modifications', paragraphs: ['Bonjour,', 'Votre biographie « {biographyTitle} » nécessite des modifications avant publication.', v.reviewerMessage ? `HTML:<strong>Note du réviseur :</strong> ${esc(v.reviewerMessage)}` : '', `LINK:${v.editorUrl}|Ouvrir l'éditeur`] },
        de: { subject: '{siteName} — Biografie zur Überarbeitung zurückgegeben', paragraphs: ['Hallo,', 'Ihre Biografie „{biographyTitle}" benötigt Änderungen vor der Veröffentlichung.', v.reviewerMessage ? `HTML:<strong>Hinweis des Prüfers:</strong> ${esc(v.reviewerMessage)}` : '', `LINK:${v.editorUrl}|Editor öffnen`] },
      });
    case 'publication_removed':
      return inner(locale, {
        en: { subject: '{siteName} — Biography removed', paragraphs: ['Hello,', 'Your biography "{biographyTitle}" has been removed and is no longer publicly visible.', `LINK:${v.contactsUrl}|Contact support`] },
        it: { subject: '{siteName} — Biografia rimossa', paragraphs: ['Ciao,', 'La tua biografia "{biographyTitle}" è stata rimossa e non è più visibile pubblicamente.', `LINK:${v.contactsUrl}|Contatta il supporto`] },
        fr: { subject: '{siteName} — Biographie supprimée', paragraphs: ['Bonjour,', 'Votre biographie « {biographyTitle} » a été supprimée et n\'est plus visible publiquement.', `LINK:${v.contactsUrl}|Contacter le support`] },
        de: { subject: '{siteName} — Biografie entfernt', paragraphs: ['Hallo,', 'Ihre Biografie „{biographyTitle}" wurde entfernt und ist nicht mehr öffentlich sichtbar.', `LINK:${v.contactsUrl}|Support kontaktieren`] },
      });
    case 'reviewer_assigned':
      return inner(locale, {
        en: { subject: '{siteName} — Biography assigned for review', paragraphs: ['Hello,', 'A biography has been assigned to you for review: "{biographyTitle}".', `LINK:${v.dashboardUrl}|Open moderation queue`] },
        it: { subject: '{siteName} — Biografia assegnata per revisione', paragraphs: ['Ciao,', 'Ti è stata assegnata una biografia da revisionare: "{biographyTitle}".', `LINK:${v.dashboardUrl}|Apri coda moderazione`] },
        fr: { subject: '{siteName} — Biographie assignée pour révision', paragraphs: ['Bonjour,', 'Une biographie vous a été assignée pour révision : « {biographyTitle} ».', `LINK:${v.dashboardUrl}|Ouvrir la file de modération`] },
        de: { subject: '{siteName} — Biografie zur Prüfung zugewiesen', paragraphs: ['Hallo,', 'Ihnen wurde eine Biografie zur Prüfung zugewiesen: „{biographyTitle}".', `LINK:${v.dashboardUrl}|Moderations-Warteschlange öffnen`] },
      });
    case 'admin_bio_force_published':
      return inner(locale, {
        en: { subject: '{siteName} — Biography published by admin', paragraphs: ['Hello,', 'Your biography "{biographyTitle}" has been published by an administrator.', `LINK:${v.dashboardUrl}|View dashboard`] },
        it: { subject: '{siteName} — Biografia pubblicata dall\'admin', paragraphs: ['Ciao,', 'La tua biografia "{biographyTitle}" è stata pubblicata da un amministratore.', `LINK:${v.dashboardUrl}|Vai alla dashboard`] },
        fr: { subject: '{siteName} — Biographie publiée par l\'admin', paragraphs: ['Bonjour,', 'Votre biographie « {biographyTitle} » a été publiée par un administrateur.', `LINK:${v.dashboardUrl}|Voir le tableau de bord`] },
        de: { subject: '{siteName} — Biografie vom Admin veröffentlicht', paragraphs: ['Hallo,', 'Ihre Biografie „{biographyTitle}" wurde von einem Administrator veröffentlicht.', `LINK:${v.dashboardUrl}|Dashboard anzeigen`] },
      });
    case 'admin_bio_set_draft':
      return inner(locale, {
        en: { subject: '{siteName} — Biography returned to draft', paragraphs: ['Hello,', 'Your biography "{biographyTitle}" has been returned to draft by an administrator.', `LINK:${v.editorUrl}|Open editor`] },
        it: { subject: '{siteName} — Biografia riportata in bozza', paragraphs: ['Ciao,', 'La tua biografia "{biographyTitle}" è stata restituita come bozza da un amministratore.', `LINK:${v.editorUrl}|Apri editor`] },
        fr: { subject: '{siteName} — Biographie remise en brouillon', paragraphs: ['Bonjour,', 'Votre biographie « {biographyTitle} » a été remise en brouillon par un administrateur.', `LINK:${v.editorUrl}|Ouvrir l'éditeur`] },
        de: { subject: '{siteName} — Biografie als Entwurf zurückgesetzt', paragraphs: ['Hallo,', 'Ihre Biografie „{biographyTitle}" wurde von einem Administrator als Entwurf zurückgesetzt.', `LINK:${v.editorUrl}|Editor öffnen`] },
      });
    case 'admin_bio_removed':
      return inner(locale, {
        en: { subject: '{siteName} — Biography removed by admin', paragraphs: ['Hello,', 'Your biography "{biographyTitle}" has been removed by an administrator.', `LINK:${v.contactsUrl}|Contact support`] },
        it: { subject: '{siteName} — Biografia rimossa dall\'admin', paragraphs: ['Ciao,', 'La tua biografia "{biographyTitle}" è stata rimossa da un amministratore.', `LINK:${v.contactsUrl}|Contatta il supporto`] },
        fr: { subject: '{siteName} — Biographie supprimée par l\'admin', paragraphs: ['Bonjour,', 'Votre biographie « {biographyTitle} » a été supprimée par un administrateur.', `LINK:${v.contactsUrl}|Contacter le support`] },
        de: { subject: '{siteName} — Biografie vom Admin entfernt', paragraphs: ['Hallo,', 'Ihre Biografie „{biographyTitle}" wurde von einem Administrator entfernt.', `LINK:${v.contactsUrl}|Support kontaktieren`] },
      });
    case 'admin_bio_restored':
      return inner(locale, {
        en: { subject: '{siteName} — Biography restored', paragraphs: ['Hello,', 'Your biography "{biographyTitle}" has been restored. You can review and republish it.', `LINK:${v.editorUrl}|Open editor`] },
        it: { subject: '{siteName} — Biografia ripristinata', paragraphs: ['Ciao,', 'La tua biografia "{biographyTitle}" è stata ripristinata. Puoi rivederla e ripubblicarla.', `LINK:${v.editorUrl}|Apri editor`] },
        fr: { subject: '{siteName} — Biographie restaurée', paragraphs: ['Bonjour,', 'Votre biographie « {biographyTitle} » a été restaurée. Vous pouvez la réviser et la republier.', `LINK:${v.editorUrl}|Ouvrir l'éditeur`] },
        de: { subject: '{siteName} — Biografie wiederhergestellt', paragraphs: ['Hallo,', 'Ihre Biografie „{biographyTitle}" wurde wiederhergestellt. Sie können sie überprüfen und erneut veröffentlichen.', `LINK:${v.editorUrl}|Editor öffnen`] },
      });
    case 'admin_bio_frozen':
      return inner(locale, {
        en: { subject: '{siteName} — Biography frozen', paragraphs: ['Hello,', 'Your biography "{biographyTitle}" has been frozen and is now read-only.', `LINK:${v.dashboardUrl}|View dashboard`] },
        it: { subject: '{siteName} — Biografia congelata', paragraphs: ['Ciao,', 'La tua biografia "{biographyTitle}" è stata congelata ed è ora in sola lettura.', `LINK:${v.dashboardUrl}|Vai alla dashboard`] },
        fr: { subject: '{siteName} — Biographie gelée', paragraphs: ['Bonjour,', 'Votre biographie « {biographyTitle} » a été gelée et est maintenant en lecture seule.', `LINK:${v.dashboardUrl}|Voir le tableau de bord`] },
        de: { subject: '{siteName} — Biografie eingefroren', paragraphs: ['Hallo,', 'Ihre Biografie „{biographyTitle}" wurde eingefroren und ist jetzt schreibgeschützt.', `LINK:${v.dashboardUrl}|Dashboard anzeigen`] },
      });
    case 'admin_bio_unfrozen':
      return inner(locale, {
        en: { subject: '{siteName} — Biography unfrozen', paragraphs: ['Hello,', 'Your biography "{biographyTitle}" has been unfrozen. You can edit it again.', `LINK:${v.editorUrl}|Open editor`] },
        it: { subject: '{siteName} — Biografia scongelata', paragraphs: ['Ciao,', 'La tua biografia "{biographyTitle}" è stata scongelata. Puoi modificarla di nuovo.', `LINK:${v.editorUrl}|Apri editor`] },
        fr: { subject: '{siteName} — Biographie dégelée', paragraphs: ['Bonjour,', 'Votre biographie « {biographyTitle} » a été dégelée. Vous pouvez à nouveau la modifier.', `LINK:${v.editorUrl}|Ouvrir l'éditeur`] },
        de: { subject: '{siteName} — Biografie aufgetaut', paragraphs: ['Hallo,', 'Ihre Biografie „{biographyTitle}" wurde aufgetaut. Sie können sie wieder bearbeiten.', `LINK:${v.editorUrl}|Editor öffnen`] },
      });
    case 'engagement_chapter_available':
      return inner(locale, {
        en: { subject: '{siteName} — You can write your next chapter', paragraphs: ['Hello,', 'Your next chapter for "{biographyTitle}" is now available (365-day rule).', v.availableDate ? `Available since: ${v.availableDate}.` : '', `LINK:${v.editorUrl}|Write the next chapter`] },
        it: { subject: '{siteName} — Puoi scrivere il prossimo capitolo', paragraphs: ['Ciao,', 'Il prossimo capitolo di "{biographyTitle}" è ora disponibile (regola dei 365 giorni).', v.availableDate ? `Disponibile dal: ${v.availableDate}.` : '', `LINK:${v.editorUrl}|Scrivi il prossimo capitolo`] },
        fr: { subject: '{siteName} — Vous pouvez écrire le prochain chapitre', paragraphs: ['Bonjour,', 'Le prochain chapitre de « {biographyTitle} » est maintenant disponible (règle des 365 jours).', v.availableDate ? `Disponible depuis : ${v.availableDate}.` : '', `LINK:${v.editorUrl}|Écrire le prochain chapitre`] },
        de: { subject: '{siteName} — Sie können das nächste Kapitel schreiben', paragraphs: ['Hallo,', 'Das nächste Kapitel von „{biographyTitle}" ist jetzt verfügbar (365-Tage-Regel).', v.availableDate ? `Verfügbar seit: ${v.availableDate}.` : '', `LINK:${v.editorUrl}|Nächstes Kapitel schreiben`] },
      });
    case 'engagement_pdf_draft_reminder':
      return inner(locale, {
        en: { subject: '{siteName} — Reminder: complete your PDF draft', paragraphs: ['Hello,', 'Your biography "{biographyTitle}" is still in the PDF draft phase (round {draftIteration}/3).', 'Open the editor to export your draft PDF and continue toward publication.', `LINK:${v.editorUrl}|Continue PDF draft`] },
        it: { subject: '{siteName} — Promemoria: completa la bozza PDF', paragraphs: ['Ciao,', 'La tua biografia "{biographyTitle}" è ancora in fase bozza PDF (round {draftIteration}/3).', 'Apri l\'editor per esportare la bozza PDF e proseguire verso la pubblicazione.', `LINK:${v.editorUrl}|Continua bozza PDF`] },
        fr: { subject: '{siteName} — Rappel : terminez votre brouillon PDF', paragraphs: ['Bonjour,', 'Votre biographie « {biographyTitle} » est toujours en phase de brouillon PDF (tour {draftIteration}/3).', 'Ouvrez l\'éditeur pour exporter le brouillon PDF et poursuivre la publication.', `LINK:${v.editorUrl}|Continuer le brouillon PDF`] },
        de: { subject: '{siteName} — Erinnerung: PDF-Entwurf abschließen', paragraphs: ['Hallo,', 'Ihre Biografie „{biographyTitle}" befindet sich noch in der PDF-Entwurfsphase (Runde {draftIteration}/3).', 'Öffnen Sie den Editor, exportieren Sie den PDF-Entwurf und fahren Sie mit der Veröffentlichung fort.', `LINK:${v.editorUrl}|PDF-Entwurf fortsetzen`] },
      });
    default:
      return { subject: '{siteName}', paragraphs: ['Hello,'] };
  }
}

export function getNotificationMessage(
  templateId: EmailTemplateId,
  locale: EmailLocale,
  vars?: EmailTemplateVars,
): string {
  const rendered = renderEmailTemplate({ templateId, locale, vars });
  const innerText = rendered.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return innerText.slice(0, 500);
}
