import { resolveSiteName, resolveSiteUrl } from './locale';
import type { EmailLocale, EmailTemplateId, EmailTemplateVars, RenderedEmail } from './types';
import { formatUmYear, umYearFromDate } from '@/lib/um';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function link(href: string, label: string): string {
  return `<a href="${esc(href)}" style="color:#121212;font-weight:600;">${esc(label)}</a>`;
}

const EMAIL_LOGO_WIDTH = 47;
const EMAIL_LOGO_HEIGHT = 56;

function emailLogoHtml(siteUrl: string, siteName: string): string {
  const logoUrl = `${siteUrl}/logo-email.png`;
  return `<p style="margin:0 0 24px;text-align:left;">
  <a href="${esc(siteUrl)}" style="text-decoration:none;display:inline-block;">
    <img src="${esc(logoUrl)}" alt="${esc(siteName)}" width="${EMAIL_LOGO_WIDTH}" height="${EMAIL_LOGO_HEIGHT}" style="display:block;border:0;outline:none;text-decoration:none;height:${EMAIL_LOGO_HEIGHT}px;width:${EMAIL_LOGO_WIDTH}px;">
  </a>
</p>`;
}

export function wrapEmailHtml(params: {
  siteName: string;
  siteUrl: string;
  locale: EmailLocale;
  bodyHtml: string;
}): string {
  const { siteName, siteUrl, locale, bodyHtml } = params;
  const umShort = formatUmYear(umYearFromDate(new Date()), 'short');
  const yearWord: Record<EmailLocale, string> = {
    en: 'Year',
    it: 'Anno',
    fr: 'An',
    de: 'Jahr',
  };
  const footerByLocale: Record<EmailLocale, string> = {
    en: `Hosted in Switzerland · ${yearWord.en} ${umShort}`,
    it: `Ospitato in Svizzera · ${yearWord.it} ${umShort}`,
    fr: `Hébergé en Suisse · ${yearWord.fr} ${umShort}`,
    de: `Gehostet in der Schweiz · ${yearWord.de} ${umShort}`,
  };
  return `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,'Times New Roman',serif;color:#121212;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e8e0d4;border-radius:12px;padding:32px 28px;">
        <tr><td>
          ${emailLogoHtml(siteUrl, siteName)}
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
    workspaceUrl: `${siteUrl}/workspace`,
    echoUrl: `${siteUrl}/dashboard`,
    loginUrl: `${siteUrl}/login`,
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
            'Thank you for signing up. Please confirm your email address to join the waitlist.',
            `LINK:${v.confirmUrl}|Confirm email address`,
            'If you did not create an account, you can ignore this message.',
          ],
        },
        it: {
          subject: '{siteName} — Conferma la tua email',
          paragraphs: [
            'Ciao,',
            'Grazie per esserti registrato. Conferma il tuo indirizzo email per entrare nella lista d’attesa.',
            `LINK:${v.confirmUrl}|Conferma indirizzo email`,
            'Se non hai creato un account, ignora questo messaggio.',
          ],
        },
        fr: {
          subject: '{siteName} — Confirmez votre email',
          paragraphs: [
            'Bonjour,',
            'Merci pour votre inscription. Veuillez confirmer votre adresse email pour rejoindre la liste d’attente.',
            `LINK:${v.confirmUrl}|Confirmer l'adresse email`,
            'Si vous n\'avez pas créé de compte, ignorez ce message.',
          ],
        },
        de: {
          subject: '{siteName} — E-Mail bestätigen',
          paragraphs: [
            'Hallo,',
            'Vielen Dank für Ihre Registrierung. Bitte bestätigen Sie Ihre E-Mail-Adresse, um auf die Warteliste zu kommen.',
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
            'Welcome to Biography Library — a free, permanent, non-profit digital archive hosted in Switzerland where you can preserve your own story or that of a family member.',
            'HTML:<strong>Getting started</strong><br>1. Open the dashboard and create your biography.<br>2. Choose your writing mode (sections or free text).<br>3. Write with the editor or talk to <strong>Echo</strong>, your AI guide (voice or text), who walks you through every step.',
            'HTML:<strong>Privacy</strong><br>You choose visibility: public, link-only, family, or private.',
            'HTML:<strong>Publishing</strong><br>When your text is ready, complete the final review by downloading the PDF draft → submit for approval → AI and human review → publication.',
            'HTML:<strong>Autobiography rules</strong><br>One biography per account. After the first published chapter, the next unlocks after 365 days.',
            `LINK:${v.workspaceUrl}|Go to workspace`,
          ],
        },
        it: {
          subject: '{siteName} — Benvenuto! Ecco come iniziare',
          paragraphs: [
            'Ciao,',
            'Benvenuto in Biography Library — un archivio digitale gratuito permanente e non profit, ospitato in Svizzera, dove puoi preservare la tua storia o quella di un familiare.',
            'HTML:<strong>Primi passi</strong><br>1. Apri la dashboard e crea la tua biografia.<br>2. Scegli la modalità di scrittura (sezioni o testo libero).<br>3. Scrivi con l\'editor o parla con <strong>Echo</strong>, la tua guida AI (voce o testo) che ti guida e aiuta passo passo.',
            'HTML:<strong>Privacy</strong><br>Scegli tu la visibilità: pubblica, solo link, famiglia o privata.',
            'HTML:<strong>Pubblicazione</strong><br>Quando il testo è pronto fai la revisione finale scaricando la bozza in PDF → manda in approvazione → controllo con AI e umani → pubblicazione.',
            'HTML:<strong>Regole autobiografia</strong><br>Una biografia per account. Dopo il primo capitolo pubblicato, il successivo si sblocca dopo 365 giorni.',
            `LINK:${v.workspaceUrl}|Vai al workspace`,
          ],
        },
        fr: {
          subject: '{siteName} — Bienvenue ! Comment commencer',
          paragraphs: [
            'Bonjour,',
            'Bienvenue sur Biography Library — une archive numérique gratuite, permanente et à but non lucratif, hébergée en Suisse, où vous pouvez préserver votre histoire ou celle d\'un proche.',
            'HTML:<strong>Premiers pas</strong><br>1. Ouvrez le tableau de bord et créez votre biographie.<br>2. Choisissez le mode d\'écriture (sections ou texte libre).<br>3. Écrivez avec l\'éditeur ou parlez à <strong>Echo</strong>, votre guide IA (voix ou texte), qui vous accompagne pas à pas.',
            'HTML:<strong>Confidentialité</strong><br>Vous choisissez la visibilité : publique, lien uniquement, famille ou privée.',
            'HTML:<strong>Publication</strong><br>Quand le texte est prêt, effectuez la révision finale en téléchargeant le brouillon PDF → soumettez pour approbation → contrôle IA et humain → publication.',
            'HTML:<strong>Règles autobiographie</strong><br>Une biographie par compte. Après le premier chapitre publié, le suivant se débloque après 365 jours.',
            `LINK:${v.workspaceUrl}|Aller au workspace`,
          ],
        },
        de: {
          subject: '{siteName} — Willkommen! So starten Sie',
          paragraphs: [
            'Hallo,',
            'Willkommen bei Biography Library — einem kostenlosen, dauerhaften, gemeinnützigen digitalen Archiv in der Schweiz, in dem Sie Ihre Geschichte oder die eines Familienmitglieds bewahren können.',
            'HTML:<strong>Erste Schritte</strong><br>1. Öffnen Sie das Dashboard und erstellen Sie Ihre Biografie.<br>2. Wählen Sie den Schreibmodus (Abschnitte oder Freitext).<br>3. Schreiben Sie im Editor oder sprechen Sie mit <strong>Echo</strong>, Ihrem KI-Guide (Sprache oder Text), der Sie Schritt für Schritt begleitet.',
            'HTML:<strong>Datenschutz</strong><br>Sie wählen die Sichtbarkeit: öffentlich, nur Link, Familie oder privat.',
            'HTML:<strong>Veröffentlichung</strong><br>Wenn der Text bereit ist: Abschlussprüfung mit PDF-Entwurf → zur Freigabe einreichen → KI- und menschliche Prüfung → Veröffentlichung.',
            'HTML:<strong>Autobiografie-Regeln</strong><br>Eine Biografie pro Konto. Nach dem ersten veröffentlichten Kapitel wird das nächste nach 365 Tagen freigeschaltet.',
            `LINK:${v.workspaceUrl}|Zum Workspace`,
          ],
        },
      });
    case 'welcome_waitlist':
      return inner(locale, {
        en: {
          subject: '{siteName} — You are on the waitlist',
          paragraphs: [
            'Hello,',
            'Thank you for confirming your email. You are on the Biography Library waitlist. You will not need to register again.',
            'We will open the platform gradually, in order of registration date. You will receive another email when you have access.',
            'The platform is in beta: some parts may not work correctly.',
          ],
        },
        it: {
          subject: '{siteName} — Sei in lista d’attesa',
          paragraphs: [
            'Ciao,',
            'Grazie per aver confermato la tua email. Sei in lista d’attesa di Biography Library. Non dovrai registrarti di nuovo.',
            'Apriremo la piattaforma gradualmente, in base alla data di registrazione. Riceverai un’altra email quando avrai accesso.',
            'La piattaforma è in versione beta: alcune parti potrebbero non funzionare correttamente.',
          ],
        },
        fr: {
          subject: '{siteName} — Vous êtes sur la liste d’attente',
          paragraphs: [
            'Bonjour,',
            'Merci d’avoir confirmé votre e-mail. Vous êtes sur la liste d’attente de Biography Library. Vous n’aurez pas à vous inscrire à nouveau.',
            'Nous ouvrirons la plateforme progressivement, selon la date d’inscription. Vous recevrez un autre e-mail lorsque vous aurez accès.',
            'La plateforme est en version bêta : certaines parties peuvent ne pas fonctionner correctement.',
          ],
        },
        de: {
          subject: '{siteName} — Sie stehen auf der Warteliste',
          paragraphs: [
            'Hallo,',
            'Danke, dass Sie Ihre E-Mail bestätigt haben. Sie stehen auf der Warteliste von Biography Library. Sie müssen sich nicht erneut registrieren.',
            'Wir öffnen die Plattform schrittweise nach Anmeldedatum. Sie erhalten eine weitere E-Mail, sobald Sie Zugang haben.',
            'Die Plattform ist in der Beta: Einige Teile funktionieren möglicherweise nicht korrekt.',
          ],
        },
      });
    case 'waitlist_access_granted':
      return inner(locale, {
        en: {
          subject: '{siteName} — You now have access',
          paragraphs: [
            'Hello,',
            'You now have access to Biography Library.',
            'The platform is in beta: some parts may not work correctly.',
            'After every writing session, save a copy on your computer. In the editor, open Export and download a UTF-8 text file and a PDF.',
            'We welcome your feedback and reports of problems.',
            `LINK:${v.contactsUrl}|Contact us`,
            `LINK:${v.loginUrl}|Sign in`,
          ],
        },
        it: {
          subject: '{siteName} — Da ora hai accesso',
          paragraphs: [
            'Ciao,',
            'Da ora hai accesso a Biography Library.',
            'La piattaforma è in versione beta: alcune parti potrebbero non funzionare correttamente.',
            'Dopo ogni sessione di scrittura, salva una copia sul computer. Nell’editor apri Esporta e scarica un file di testo UTF-8 e un PDF.',
            'Ci fa piacere il tuo feedback e la segnalazione dei problemi.',
            `LINK:${v.contactsUrl}|Contattaci`,
            `LINK:${v.loginUrl}|Accedi`,
          ],
        },
        fr: {
          subject: '{siteName} — Vous avez désormais accès',
          paragraphs: [
            'Bonjour,',
            'Vous avez désormais accès à Biography Library.',
            'La plateforme est en version bêta : certaines parties peuvent ne pas fonctionner correctement.',
            'Après chaque session d’écriture, enregistrez une copie sur votre ordinateur. Dans l’éditeur, ouvrez Exporter et téléchargez un fichier texte UTF-8 et un PDF.',
            'Vos retours et signalements de problèmes sont les bienvenus.',
            `LINK:${v.contactsUrl}|Nous contacter`,
            `LINK:${v.loginUrl}|Se connecter`,
          ],
        },
        de: {
          subject: '{siteName} — Sie haben jetzt Zugang',
          paragraphs: [
            'Hallo,',
            'Sie haben jetzt Zugang zu Biography Library.',
            'Die Plattform ist in der Beta: Einige Teile funktionieren möglicherweise nicht korrekt.',
            'Speichern Sie nach jeder Schreibsitzung eine Kopie auf Ihrem Computer. Öffnen Sie im Editor Export und laden Sie eine UTF-8-Textdatei und ein PDF herunter.',
            'Wir freuen uns über Rückmeldungen und Hinweise auf Probleme.',
            `LINK:${v.contactsUrl}|Kontakt`,
            `LINK:${v.loginUrl}|Anmelden`,
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
    case 'report_immediate_author':
      return inner(locale, {
        en: { subject: '{siteName} — Biography suspended: document needed in 14 days', paragraphs: ['Hello,', 'Your biography "{biographyTitle}" is no longer public.', 'Within 14 days, send a death certificate or an equivalent document. If we do not receive it, the biography stays out of the public catalog and a reviewer will decide.'] },
        it: { subject: '{siteName} — Scheda sospesa: documento entro 14 giorni', paragraphs: ['Ciao,', 'La tua biografia "{biographyTitle}" non è più pubblica.', 'Entro 14 giorni invia un certificato di morte o un documento equivalente. Se non arriva, la scheda resta fuori dal catalogo e decide un revisore.'] },
        fr: { subject: '{siteName} — Fiche suspendue : document sous 14 jours', paragraphs: ['Bonjour,', 'Votre biographie « {biographyTitle} » n’est plus publique.', 'Sous 14 jours, envoyez un certificat de décès ou un document équivalent. Sans réponse, la fiche reste hors du catalogue et un réviseur décidera.'] },
        de: { subject: '{siteName} — Biografie ausgesetzt: Dokument binnen 14 Tagen', paragraphs: ['Hallo,', 'Ihre Biografie „{biographyTitle}" ist nicht mehr öffentlich.', 'Senden Sie binnen 14 Tagen eine Sterbeurkunde oder ein gleichwertiges Dokument. Ohne Antwort bleibt die Biografie außerhalb des Katalogs und eine Prüferin oder ein Prüfer entscheidet.'] },
      });
    case 'report_immediate_reviewer':
      return inner(locale, {
        en: { subject: '{siteName} — High-priority report', paragraphs: ['Hello,', 'A report about a living person or illegal content arrived. The biography was suspended and is no longer public.', 'The author has 14 days to send a death certificate or an equivalent document.'] },
        it: { subject: '{siteName} — Segnalazione ad alta priorità', paragraphs: ['Ciao,', 'È arrivata una segnalazione per persona in vita o contenuto illegale. La scheda è stata sospesa e non è più pubblica.', 'L’autore ha 14 giorni per inviare un certificato di morte o un documento equivalente.'] },
        fr: { subject: '{siteName} — Signalement prioritaire', paragraphs: ['Bonjour,', 'Un signalement pour personne vivante ou contenu illégal est arrivé. La fiche a été suspendue et n’est plus publique.', 'L’auteur a 14 jours pour envoyer un certificat de décès ou un document équivalent.'] },
        de: { subject: '{siteName} — Meldung mit hoher Priorität', paragraphs: ['Hallo,', 'Eine Meldung zu einer lebenden Person oder zu illegalem Inhalt ist eingegangen. Die Biografie wurde ausgesetzt und ist nicht mehr öffentlich.', 'Die Autorin oder der Autor hat 14 Tage Zeit für eine Sterbeurkunde oder ein gleichwertiges Dokument.'] },
      });
    case 'report_receipt':
      return inner(locale, {
        en: { subject: '{siteName} — We received your report', paragraphs: ['Hello,', 'We received your report about "{biographyTitle}".', 'A reviewer will decide within 30 days.'] },
        it: { subject: '{siteName} — Abbiamo ricevuto la segnalazione', paragraphs: ['Ciao,', 'Abbiamo ricevuto la segnalazione su "{biographyTitle}".', 'Un revisore decide entro 30 giorni.'] },
        fr: { subject: '{siteName} — Nous avons reçu votre signalement', paragraphs: ['Bonjour,', 'Nous avons reçu votre signalement sur « {biographyTitle} ».', 'Un réviseur décidera sous 30 jours.'] },
        de: { subject: '{siteName} — Wir haben Ihre Meldung erhalten', paragraphs: ['Hallo,', 'Wir haben Ihre Meldung zu „{biographyTitle}" erhalten.', 'Eine Prüferin oder ein Prüfer entscheidet binnen 30 Tagen.'] },
      });
    case 'report_reviewer_reminder':
      return inner(locale, {
        en: { subject: '{siteName} — Report still waiting, day {day}', paragraphs: ['Hello,', 'The report on "{biographyTitle}" is still open.', 'This is the reminder for day {day} of the 30 days to decide.'] },
        it: { subject: '{siteName} — Segnalazione ancora aperta, giorno {day}', paragraphs: ['Ciao,', 'La segnalazione su "{biographyTitle}" è ancora aperta.', 'Questo è il promemoria del giorno {day} sui 30 per decidere.'] },
        fr: { subject: '{siteName} — Signalement encore ouvert, jour {day}', paragraphs: ['Bonjour,', 'Le signalement sur « {biographyTitle} » est encore ouvert.', 'Ceci est le rappel du jour {day} sur les 30 jours pour décider.'] },
        de: { subject: '{siteName} — Meldung noch offen, Tag {day}', paragraphs: ['Hallo,', 'Die Meldung zu „{biographyTitle}" ist noch offen.', 'Dies ist die Erinnerung am Tag {day} der 30 Tage bis zur Entscheidung.'] },
      });
    case 'report_revision_requested':
      return inner(locale, {
        en: { subject: '{siteName} — Revision requested', paragraphs: ['Hello,', 'Your biography "{biographyTitle}" is no longer public.', 'You have 30 days to send a revision. It stays out of the catalog until a reviewer accepts it.', v.reviewerMessage ? `HTML:<strong>Note:</strong> ${esc(v.reviewerMessage)}` : ''] },
        it: { subject: '{siteName} — Revisione richiesta', paragraphs: ['Ciao,', 'La tua biografia "{biographyTitle}" non è più pubblica.', 'Hai 30 giorni per rimandare il testo. Resta fuori dal catalogo finché un revisore non la accetta.', v.reviewerMessage ? `HTML:<strong>Nota:</strong> ${esc(v.reviewerMessage)}` : ''] },
        fr: { subject: '{siteName} — Révision demandée', paragraphs: ['Bonjour,', 'Votre biographie « {biographyTitle} » n’est plus publique.', 'Vous avez 30 jours pour renvoyer le texte. Elle reste hors du catalogue jusqu’à l’acceptation d’un réviseur.', v.reviewerMessage ? `HTML:<strong>Note :</strong> ${esc(v.reviewerMessage)}` : ''] },
        de: { subject: '{siteName} — Überarbeitung angefordert', paragraphs: ['Hallo,', 'Ihre Biografie „{biographyTitle}" ist nicht mehr öffentlich.', 'Sie haben 30 Tage, um den Text erneut zu senden. Sie bleibt außerhalb des Katalogs, bis eine Prüferin oder ein Prüfer sie annimmt.', v.reviewerMessage ? `HTML:<strong>Hinweis:</strong> ${esc(v.reviewerMessage)}` : ''] },
      });
    case 'report_author_revision_reminder':
      return inner(locale, {
        en: { subject: '{siteName} — {day} of 30 days to send the revision', paragraphs: ['Hello,', 'Your biography "{biographyTitle}" is still waiting for your revision.', 'Day {day} of 30. After that it stays out of the catalog.'] },
        it: { subject: '{siteName} — Giorno {day} di 30 per la revisione', paragraphs: ['Ciao,', 'La tua biografia "{biographyTitle}" aspetta ancora la revisione.', 'Giorno {day} di 30. Dopo resta fuori dal catalogo.'] },
        fr: { subject: '{siteName} — Jour {day} sur 30 pour la révision', paragraphs: ['Bonjour,', 'Votre biographie « {biographyTitle} » attend encore votre révision.', 'Jour {day} sur 30. Ensuite elle reste hors du catalogue.'] },
        de: { subject: '{siteName} — Tag {day} von 30 für die Überarbeitung', paragraphs: ['Hallo,', 'Ihre Biografie „{biographyTitle}" wartet noch auf die Überarbeitung.', 'Tag {day} von 30. Danach bleibt sie außerhalb des Katalogs.'] },
      });
    case 'report_revision_overdue':
      return inner(locale, {
        en: { subject: '{siteName} — Revision deadline passed', paragraphs: ['Hello,', 'The 30 days to revise "{biographyTitle}" have passed.', 'The biography stays out of the public catalog.'] },
        it: { subject: '{siteName} — Tempo per la revisione scaduto', paragraphs: ['Ciao,', 'I 30 giorni per rivedere "{biographyTitle}" sono passati.', 'La scheda resta fuori dal catalogo pubblico.'] },
        fr: { subject: '{siteName} — Délai de révision dépassé', paragraphs: ['Bonjour,', 'Les 30 jours pour réviser « {biographyTitle} » sont passés.', 'La fiche reste hors du catalogue public.'] },
        de: { subject: '{siteName} — Frist für die Überarbeitung abgelaufen', paragraphs: ['Hallo,', 'Die 30 Tage zur Überarbeitung von „{biographyTitle}" sind vorbei.', 'Die Biografie bleibt außerhalb des öffentlichen Katalogs.'] },
      });
    case 'report_appeal_opened':
      return inner(locale, {
        en: { subject: '{siteName} — An author filed an appeal', paragraphs: ['Hello,', 'The author of "{biographyTitle}" filed an appeal.', 'The biography stays in the state of the decision until you decide the appeal.'] },
        it: { subject: '{siteName} — Un autore ha presentato ricorso', paragraphs: ['Ciao,', 'L’autore di "{biographyTitle}" ha presentato ricorso.', 'La scheda resta nello stato della decisione finché non decidete il ricorso.'] },
        fr: { subject: '{siteName} — Un auteur a formé un recours', paragraphs: ['Bonjour,', 'L’auteur de « {biographyTitle} » a formé un recours.', 'La fiche reste dans l’état de la décision jusqu’à votre décision sur le recours.'] },
        de: { subject: '{siteName} — Einspruch eingegangen', paragraphs: ['Hallo,', 'Die Autorin oder der Autor von „{biographyTitle}" hat Einspruch eingelegt.', 'Die Biografie bleibt im Zustand der Entscheidung, bis Sie über den Einspruch entscheiden.'] },
      });
    case 'report_appeal_result':
      return inner(locale, {
        en: { subject: '{siteName} — Appeal decided', paragraphs: ['Hello,', 'The appeal on "{biographyTitle}" was {outcome}.', 'While the appeal was open, the biography stayed in the state of the earlier decision.'] },
        it: { subject: '{siteName} — Ricorso deciso', paragraphs: ['Ciao,', 'Il ricorso su "{biographyTitle}" è stato {outcome}.', 'Finché il ricorso era aperto, la scheda è restata nello stato della decisione precedente.'] },
        fr: { subject: '{siteName} — Recours tranché', paragraphs: ['Bonjour,', 'Le recours sur « {biographyTitle} » a été {outcome}.', 'Pendant le recours, la fiche est restée dans l’état de la décision précédente.'] },
        de: { subject: '{siteName} — Einspruch entschieden', paragraphs: ['Hallo,', 'Der Einspruch zu „{biographyTitle}" wurde {outcome}.', 'Solange der Einspruch offen war, blieb die Biografie im Zustand der früheren Entscheidung.'] },
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
