import type { Language } from '@/lib/i18n/translations';

/** Display alphabet of UM 1.0. Order is the numeric value 0–28. Do not reorder. */
export const UM_SPEC_ALPHABET = '0 1 2 3 4 5 6 7 8 9 B C D F G H J K M N P Q R S T V W X Z';

export const UM_SPEC_EXAMPLE = 'UM-0000-K3NQ-7FX2-MVP4';

/** Section 7 test vectors. Do not edit: they lock the issued format. */
export const UM_SPEC_VECTORS: { year: string; body: string; id: string }[] = [
  { year: '0', body: 'K3NQ7FX2MVP', id: 'UM-0000-K3NQ-7FX2-MVP4' },
  { year: '0', body: 'BCDFGHJKMNP', id: 'UM-0000-BCDF-GHJK-MNPP' },
  { year: '1', body: '00000000000', id: 'UM-0001-0000-0000-0004' },
  { year: '25', body: 'Z9X8W7V6T5S', id: 'UM-0025-Z9X8-W7V6-T5ST' },
  { year: '100', body: 'QQQQQQQQQQQ', id: 'UM-0100-QQQQ-QQQQ-QQQQ' },
  { year: '9999', body: 'K3NQ7FX2MVP', id: 'UM-9999-K3NQ-7FX2-MVP7' },
  { year: '10000', body: 'K3NQ7FX2MVP', id: 'UM-10000-K3NQ-7FX2-MVP3' },
  { year: '99999', body: 'Z9X8W7V6T5S', id: 'UM-99999-Z9X8-W7V6-T5S2' },
];

export type UmSpecSection = { heading: string; paragraphs: string[] };

export type UmIdentifierPageCopy = {
  title: string;
  version: string;
  issuer: string;
  date: string;
  equalValue: string;
  sections: UmSpecSection[];
  vectorCaption: string;
  yearColumn: string;
  bodyColumn: string;
  idColumn: string;
  resolveExample: string;
};

const it: UmIdentifierPageCopy = {
  title: 'Identificativo UM',
  version: 'Specifica pubblica, versione 1.0',
  issuer: 'Emessa dall’Associazione Biography Library, Lugano, Svizzera.',
  date: '3 settembre 2026, Anno 0 UM. Revisione editoriale del 19 settembre 2026 (Anno 0 UM): nessun identificativo già emesso è stato modificato.',
  equalValue:
    'Questo testo è pubblicato in italiano, inglese, francese e tedesco. Le quattro lingue hanno lo stesso valore.',
  sections: [
    {
      heading: '1. A che cosa serve',
      paragraphs: [
        'Ogni scheda dell’archivio riceve alla creazione un identificativo permanente. È una breve stringa che non cambia mai, che non viene mai riassegnata, e che serve a ritrovare quella scheda anche quando l’indirizzo web con cui è stata pubblicata non esiste più.',
        'L’identificativo non sostituisce l’indirizzo leggibile: si affianca. UM sta per Memoria Universale, il sistema con cui Biography Library conta gli anni a partire dal 2026 del calendario gregoriano, assunto come Anno 0 UM. Le lettere UM fanno parte della stringa e non si traducono.',
      ],
    },
    {
      heading: '2. A chi legge questo documento nel futuro',
      paragraphs: [
        'La stringa è un nome. Non descrive la persona e non contiene informazioni su di lei. Comincia sempre con UM, poi l’anno di creazione contato da un anno zero, poi dodici caratteri di cui l’ultimo è un carattere di verifica. Il calcolo si può fare a mano.',
        'I caratteri del corpo sono ventinove: dieci cifre e diciannove lettere. Le vocali sono escluse, così la stringa non forma parole. Sono escluse anche le lettere che si confondono con le cifre.',
      ],
    },
    {
      heading: '3. Forma canonica',
      paragraphs: [
        'Esempio: UM-0000-K3NQ-7FX2-MVP4. Quattro parti separate da trattini. UM è il nome dello schema. 0000 è l’anno UM, scritto con almeno quattro cifre. L’anno 0 UM è il 2026 gregoriano; ogni anno UM comincia il 1° gennaio, in tempo universale coordinato. Oltre l’anno 9999 il campo dell’anno si allunga. Gli ultimi dodici caratteri sono undici caratteri assegnati e un carattere di controllo, sempre l’ultimo. La forma scritta usa le maiuscole.',
      ],
    },
    {
      heading: '4. Alfabeto',
      paragraphs: [
        'Il corpo usa solo questi caratteri, in quest’ordine, con valore da 0 a 28:',
        UM_SPEC_ALPHABET,
        'Sono escluse le vocali A, E, I, O, U e la lettera L. Il campo dell’anno usa solo le cifre da 0 a 9.',
      ],
    },
    {
      heading: '5. Confronto e normalizzazione',
      paragraphs: [
        'Due identificativi sono lo stesso se coincidono dopo aver tolto trattini e spazi e aver usato una sola cassa di caratteri. UM-0000-K3NQ-7FX2-MVP4, UM0000K3NQ7FX2MVP4 e um-0000-k3nq-7fx2-mvp4 sono lo stesso identificativo. Un sistema che li accetta deve accettarli in tutte queste forme.',
      ],
    },
    {
      heading: '6. Il carattere di controllo',
      paragraphs: [
        'L’ultimo carattere si calcola su tutte le cifre dell’anno e sugli undici caratteri del corpo, senza le lettere UM e senza i trattini. Le posizioni si numerano da uno. Ogni carattere diventa il suo valore nell’alfabeto, si moltiplica per la posizione, si sommano i prodotti, si divide per 29 e si prende il resto. Il carattere di controllo è quello che nell’alfabeto occupa quel resto.',
        'Il 29 è un numero primo: il controllo rileva sempre la sostituzione di un solo carattere e lo scambio di due caratteri adiacenti. Nell’esempio UM-0000-K3NQ-7FX2-MVP4 la somma dei prodotti è 1802 e il resto della divisione per 29 è 4, quindi l’ultimo carattere è 4. Se l’anno ha più di quattro cifre le posizioni partono comunque dalla prima cifra.',
      ],
    },
    {
      heading: '7. Vettori di prova',
      paragraphs: [
        'Qualunque implementazione deve produrre esattamente questi identificativi. I vettori con l’anno a cinque cifre esistono perché un programma che dia per scontate quattro cifre deve fallire il giorno in cui viene scritto, non fra diecimila anni.',
      ],
    },
    {
      heading: '8. Regole di emissione',
      paragraphs: [
        'L’identificativo è assegnato alla creazione della scheda e non è mai modificato, né riassegnato, nemmeno se la scheda viene cancellata. Il corpo di undici caratteri è casuale e non contiene nome, date, luogo o numero d’ordine. L’unicità è garantita dal registro: prima di assegnare un identificativo il sistema verifica che non esista già.',
      ],
    },
    {
      heading: '9. Risoluzione',
      paragraphs: [
        'L’indirizzo canonico è https://id.biographylibrary.org/ seguito dall’identificativo, con o senza trattini e in qualunque cassa. Un identificativo emesso risponde per sempre. Se la scheda non è consultabile, la pagina dice che l’identificativo esiste e che il contenuto non è disponibile. Non risponde mai come pagina inesistente. Il dominio può cambiare; la stringa è l’identificativo.',
      ],
    },
    {
      heading: '10. L’autorità emittente',
      paragraphs: [
        'Gli identificativi UM sono emessi soltanto dall’Associazione Biography Library, Lugano, Canton Ticino, Svizzera, registro di commercio CHE-416.014.530. Nessun altro può emettere stringhe che cominciano con UM- secondo questa specifica. L’associazione mantiene la risoluzione, pubblica questa specifica e ne deposita copia nell’archivio.',
      ],
    },
    {
      heading: '11. Versione della specifica',
      paragraphs: [
        'Questa è la versione 1.0. Le versioni successive possono aggiungere regole ma non possono invalidare identificativi già emessi. Il formato, l’alfabeto e l’algoritmo di controllo sono definitivi per ogni identificativo che comincia con UM-.',
      ],
    },
    {
      heading: '12. Se Biography Library cessasse di esistere',
      paragraphs: [
        'Lo statuto prevede che, in caso di scioglimento, l’archivio sia affidato a un ente custode e che il codice resti pubblico. L’ente custode subentra nell’obbligo di risoluzione. Se nessun ente subentra, gli identificativi restano leggibili perché tutto ciò che serve per interpretarli è in questo documento.',
      ],
    },
    {
      heading: '13. Dove vive questa specifica',
      paragraphs: [
        'È pubblicata sul sito, depositata nel repository pubblico del codice, inclusa nelle esportazioni complete dell’archivio e riprodotta sui supporti di conservazione insieme alle biografie.',
      ],
    },
    {
      heading: '14. Implementazione di riferimento',
      paragraphs: [
        'Il codice di riferimento, che calcola il carattere di controllo, normalizza la stringa e verifica i vettori di questa pagina, è nel repository pubblico. Questa pagina non modifica l’alfabeto, il carattere di controllo, i vettori né gli identificativi già emessi.',
      ],
    },
  ],
  vectorCaption: 'Vettori di prova della versione 1.0',
  yearColumn: 'Anno UM',
  bodyColumn: 'Corpo assegnato',
  idColumn: 'Identificativo completo',
  resolveExample: 'https://id.biographylibrary.org/UM-0000-K3NQ-7FX2-MVP4',
};

const en: UmIdentifierPageCopy = {
  title: 'UM identifier',
  version: 'Public specification, version 1.0',
  issuer: 'Issued by Associazione Biography Library, Lugano, Switzerland.',
  date: '3 September 2026, Year 0 UM. Editorial revision of 19 September 2026 (Year 0 UM): no identifier already issued was changed.',
  equalValue:
    'This text is published in Italian, English, French, and German. The four languages have equal value.',
  sections: [
    {
      heading: '1. What it is for',
      paragraphs: [
        'Every record in the archive receives a permanent identifier when it is created. It is a short string that never changes, is never reassigned, and finds that record even after the web address used to publish it no longer exists.',
        'The identifier does not replace the readable address: it stands beside it. UM means Universal Memory, the system by which Biography Library counts years from 2026 of the Gregorian calendar, taken as Year 0 UM. The letters UM are part of the string and are not translated.',
      ],
    },
    {
      heading: '2. For a reader in the future',
      paragraphs: [
        'The string is a name. It does not describe the person and holds no information about them. It always starts with UM, then the year of creation counted from a year zero, then twelve characters of which the last is a check character. The calculation can be done by hand.',
        'The body uses twenty-nine characters: ten digits and nineteen letters. Vowels are left out so the string cannot form words. Letters that are easily confused with digits are left out too.',
      ],
    },
    {
      heading: '3. Canonical form',
      paragraphs: [
        'Example: UM-0000-K3NQ-7FX2-MVP4. Four parts separated by hyphens. UM is the scheme name. 0000 is the UM year, written with at least four digits. Year 0 UM is Gregorian 2026; each UM year begins on 1 January, in Coordinated Universal Time. Past year 9999 the year field grows. The last twelve characters are eleven assigned characters and one check character, always last. The written form uses capitals.',
      ],
    },
    {
      heading: '4. Alphabet',
      paragraphs: [
        'The body uses only these characters, in this order, with values from 0 to 28:',
        UM_SPEC_ALPHABET,
        'The vowels A, E, I, O, U and the letter L are excluded. The year field uses only the digits 0 to 9.',
      ],
    },
    {
      heading: '5. Comparison and normalisation',
      paragraphs: [
        'Two identifiers are the same if they match after hyphens and spaces are removed and a single letter case is used. UM-0000-K3NQ-7FX2-MVP4, UM0000K3NQ7FX2MVP4, and um-0000-k3nq-7fx2-mvp4 are the same identifier. A system that accepts them must accept all of these forms.',
      ],
    },
    {
      heading: '6. The check character',
      paragraphs: [
        'The last character is calculated from all year digits and the eleven body characters, without the letters UM and without the hyphens. Positions are numbered from one. Each character becomes its alphabet value, is multiplied by its position, the products are added, the sum is divided by 29, and the remainder is kept. The check character is the alphabet character at that remainder.',
        '29 is prime: the check always detects a single-character substitution and a swap of two adjacent characters. For UM-0000-K3NQ-7FX2-MVP4 the sum of the products is 1802 and the remainder of division by 29 is 4, so the last character is 4. If the year has more than four digits, positions still start at the first digit.',
      ],
    },
    {
      heading: '7. Test vectors',
      paragraphs: [
        'Any implementation must produce exactly these identifiers. The five-digit year vectors exist so that a program which assumes four digits fails on the day it is written, not ten thousand years later.',
      ],
    },
    {
      heading: '8. Issuance rules',
      paragraphs: [
        'The identifier is assigned when the record is created and is never changed, nor reassigned, even if the record is deleted. The eleven-character body is random and contains no name, dates, place, or sequence number. Uniqueness is guaranteed by the register: before assignment the system checks that the identifier does not already exist.',
      ],
    },
    {
      heading: '9. Resolution',
      paragraphs: [
        'The canonical address is https://id.biographylibrary.org/ followed by the identifier, with or without hyphens and in any letter case. An issued identifier answers forever. If the record cannot be read, the page says that the identifier exists and that the content is not available. It never answers as a missing page. The domain may change; the string is the identifier.',
      ],
    },
    {
      heading: '10. The issuing authority',
      paragraphs: [
        'UM identifiers are issued only by Associazione Biography Library, Lugano, Canton Ticino, Switzerland, commercial register CHE-416.014.530. No one else may issue strings that begin with UM- under this specification. The association keeps resolution working, publishes this specification, and deposits a copy in the archive.',
      ],
    },
    {
      heading: '11. Version of the specification',
      paragraphs: [
        'This is version 1.0. Later versions may add rules but cannot invalidate identifiers already issued. The format, the alphabet, and the check algorithm are final for every identifier that begins with UM-.',
      ],
    },
    {
      heading: '12. If Biography Library ceased to exist',
      paragraphs: [
        'The statutes provide that, on dissolution, the archive is entrusted to a custodian and the code stays public. The custodian takes over the duty to resolve issued identifiers. If no custodian takes over, the identifiers remain readable because everything needed to interpret them is in this document.',
      ],
    },
    {
      heading: '13. Where this specification lives',
      paragraphs: [
        'It is published on the site, deposited in the public code repository, included in complete archive exports, and copied onto long-term storage together with the biographies.',
      ],
    },
    {
      heading: '14. Reference implementation',
      paragraphs: [
        'The reference code, which calculates the check character, normalises the string, and checks the vectors on this page, is in the public repository. This page does not change the alphabet, the check character, the vectors, or identifiers already issued.',
      ],
    },
  ],
  vectorCaption: 'Version 1.0 test vectors',
  yearColumn: 'UM year',
  bodyColumn: 'Assigned body',
  idColumn: 'Full identifier',
  resolveExample: 'https://id.biographylibrary.org/UM-0000-K3NQ-7FX2-MVP4',
};

const fr: UmIdentifierPageCopy = {
  title: 'Identifiant UM',
  version: 'Spécification publique, version 1.0',
  issuer: 'Émise par l’Associazione Biography Library, Lugano, Suisse.',
  date: '3 septembre 2026, An 0 UM. Révision éditoriale du 19 septembre 2026 (An 0 UM) : aucun identifiant déjà émis n’a été modifié.',
  equalValue:
    'Ce texte est publié en italien, en anglais, en français et en allemand. Les quatre langues ont la même valeur.',
  sections: [
    {
      heading: '1. À quoi il sert',
      paragraphs: [
        'Chaque fiche de l’archive reçoit à sa création un identifiant permanent. C’est une courte chaîne qui ne change jamais, qui n’est jamais réattribuée, et qui permet de retrouver cette fiche même lorsque l’adresse web de publication n’existe plus.',
        'L’identifiant ne remplace pas l’adresse lisible : il l’accompagne. UM signifie Mémoire universelle, le système par lequel Biography Library compte les années à partir de 2026 du calendrier grégorien, pris comme An 0 UM. Les lettres UM font partie de la chaîne et ne se traduisent pas.',
      ],
    },
    {
      heading: '2. Pour qui lira ce document plus tard',
      paragraphs: [
        'La chaîne est un nom. Elle ne décrit pas la personne et ne contient rien sur elle. Elle commence toujours par UM, puis l’année de création comptée depuis une année zéro, puis douze caractères dont le dernier est un caractère de contrôle. Le calcul peut se faire à la main.',
        'Le corps utilise vingt-neuf caractères : dix chiffres et dix-neuf lettres. Les voyelles sont exclues pour que la chaîne ne forme pas de mots. Les lettres que l’on confond avec les chiffres le sont aussi.',
      ],
    },
    {
      heading: '3. Forme canonique',
      paragraphs: [
        'Exemple : UM-0000-K3NQ-7FX2-MVP4. Quatre parties séparées par des traits. UM est le nom du schéma. 0000 est l’année UM, écrite avec au moins quatre chiffres. L’an 0 UM est 2026 grégorien ; chaque année UM commence le 1er janvier, en temps universel coordonné. Au-delà de 9999 le champ de l’année s’allonge. Les douze derniers caractères sont onze caractères attribués et un caractère de contrôle, toujours le dernier. La forme écrite utilise les majuscules.',
      ],
    },
    {
      heading: '4. Alphabet',
      paragraphs: [
        'Le corps n’utilise que ces caractères, dans cet ordre, avec une valeur de 0 à 28 :',
        UM_SPEC_ALPHABET,
        'Les voyelles A, E, I, O, U et la lettre L sont exclues. Le champ de l’année n’utilise que les chiffres de 0 à 9.',
      ],
    },
    {
      heading: '5. Comparaison et normalisation',
      paragraphs: [
        'Deux identifiants sont le même s’ils coïncident après suppression des traits et des espaces et passage à une seule casse. UM-0000-K3NQ-7FX2-MVP4, UM0000K3NQ7FX2MVP4 et um-0000-k3nq-7fx2-mvp4 sont le même identifiant. Un système qui les accepte doit les accepter sous toutes ces formes.',
      ],
    },
    {
      heading: '6. Le caractère de contrôle',
      paragraphs: [
        'Le dernier caractère se calcule sur tous les chiffres de l’année et sur les onze caractères du corps, sans les lettres UM et sans les traits. Les positions se numérotent à partir de un. Chaque caractère devient sa valeur dans l’alphabet, est multiplié par sa position, les produits sont additionnés, la somme est divisée par 29 et l’on garde le reste. Le caractère de contrôle est celui qui occupe ce reste dans l’alphabet.',
        '29 est premier : le contrôle détecte toujours le remplacement d’un seul caractère et l’échange de deux caractères adjacents. Pour UM-0000-K3NQ-7FX2-MVP4 la somme des produits est 1802 et le reste de la division par 29 est 4, donc le dernier caractère est 4. Si l’année a plus de quatre chiffres, les positions partent quand même du premier chiffre.',
      ],
    },
    {
      heading: '7. Vecteurs d’essai',
      paragraphs: [
        'Toute implémentation doit produire exactement ces identifiants. Les vecteurs à année de cinq chiffres existent pour qu’un programme qui suppose quatre chiffres échoue le jour où il est écrit, et non dans dix mille ans.',
      ],
    },
    {
      heading: '8. Règles d’émission',
      paragraphs: [
        'L’identifiant est attribué à la création de la fiche et n’est jamais modifié, ni réattribué, même si la fiche est effacée. Le corps de onze caractères est aléatoire et ne contient ni nom, ni dates, ni lieu, ni numéro d’ordre. L’unicité est garantie par le registre : avant l’attribution le système vérifie que l’identifiant n’existe pas déjà.',
      ],
    },
    {
      heading: '9. Résolution',
      paragraphs: [
        'L’adresse canonique est https://id.biographylibrary.org/ suivie de l’identifiant, avec ou sans traits et dans n’importe quelle casse. Un identifiant émis répond pour toujours. Si la fiche n’est pas consultable, la page dit que l’identifiant existe et que le contenu n’est pas disponible. Elle ne répond jamais comme une page absente. Le domaine peut changer ; la chaîne est l’identifiant.',
      ],
    },
    {
      heading: '10. L’autorité émettrice',
      paragraphs: [
        'Les identifiants UM sont émis seulement par l’Associazione Biography Library, Lugano, canton du Tessin, Suisse, registre du commerce CHE-416.014.530. Personne d’autre ne peut émettre des chaînes qui commencent par UM- selon cette spécification. L’association maintient la résolution, publie cette spécification et en dépose une copie dans l’archive.',
      ],
    },
    {
      heading: '11. Version de la spécification',
      paragraphs: [
        'Ceci est la version 1.0. Les versions suivantes pourront ajouter des règles mais ne pourront pas invalider les identifiants déjà émis. Le format, l’alphabet et l’algorithme de contrôle sont définitifs pour tout identifiant qui commence par UM-.',
      ],
    },
    {
      heading: '12. Si Biography Library cessait d’exister',
      paragraphs: [
        'Les statuts prévoient qu’en cas de dissolution l’archive soit confiée à un dépositaire et que le code reste public. Le dépositaire reprend l’obligation de résolution. Si aucun dépositaire ne succède, les identifiants restent lisibles parce que tout ce qu’il faut pour les interpréter est dans ce document.',
      ],
    },
    {
      heading: '13. Où vit cette spécification',
      paragraphs: [
        'Elle est publiée sur le site, déposée dans le dépôt public du code, incluse dans les exportations complètes de l’archive et reproduite sur les supports de conservation avec les biographies.',
      ],
    },
    {
      heading: '14. Implémentation de référence',
      paragraphs: [
        'Le code de référence, qui calcule le caractère de contrôle, normalise la chaîne et vérifie les vecteurs de cette page, est dans le dépôt public. Cette page ne modifie ni l’alphabet, ni le caractère de contrôle, ni les vecteurs, ni les identifiants déjà émis.',
      ],
    },
  ],
  vectorCaption: 'Vecteurs d’essai de la version 1.0',
  yearColumn: 'Année UM',
  bodyColumn: 'Corps attribué',
  idColumn: 'Identifiant complet',
  resolveExample: 'https://id.biographylibrary.org/UM-0000-K3NQ-7FX2-MVP4',
};

const de: UmIdentifierPageCopy = {
  title: 'UM-Kennung',
  version: 'Öffentliche Spezifikation, Version 1.0',
  issuer: 'Herausgegeben von der Associazione Biography Library, Lugano, Schweiz.',
  date: '3. September 2026, Jahr 0 UM. Redaktionelle Fassung vom 19. September 2026 (Jahr 0 UM): keine bereits ausgegebene Kennung wurde geändert.',
  equalValue:
    'Dieser Text ist auf Italienisch, Englisch, Französisch und Deutsch veröffentlicht. Die vier Sprachen haben denselben Wert.',
  sections: [
    {
      heading: '1. Wozu sie dient',
      paragraphs: [
        'Jedes Blatt im Archiv erhält bei der Erstellung eine dauerhafte Kennung. Es ist eine kurze Zeichenfolge, die sich nie ändert, nie neu vergeben wird und das Blatt auch dann wiederfindet, wenn die Webadresse der Veröffentlichung nicht mehr besteht.',
        'Die Kennung ersetzt die lesbare Adresse nicht: sie steht daneben. UM bedeutet Universales Gedächtnis, das System, mit dem Biography Library die Jahre ab 2026 des gregorianischen Kalenders zählt, genommen als Jahr 0 UM. Die Buchstaben UM gehören zur Zeichenfolge und werden nicht übersetzt.',
      ],
    },
    {
      heading: '2. Für eine Leserin oder einen Leser in der Zukunft',
      paragraphs: [
        'Die Zeichenfolge ist ein Name. Sie beschreibt die Person nicht und enthält nichts über sie. Sie beginnt immer mit UM, dann das Erstellungsjahr gezählt von einem Jahr null, dann zwölf Zeichen, deren letztes ein Prüfzeichen ist. Die Rechnung lässt sich von Hand machen.',
        'Der Körper verwendet neunundzwanzig Zeichen: zehn Ziffern und neunzehn Buchstaben. Vokale fehlen, damit keine Wörter entstehen. Buchstaben, die man mit Ziffern verwechselt, fehlen ebenfalls.',
      ],
    },
    {
      heading: '3. Kanonische Form',
      paragraphs: [
        'Beispiel: UM-0000-K3NQ-7FX2-MVP4. Vier Teile, getrennt durch Bindestriche. UM ist der Name des Schemas. 0000 ist das UM-Jahr, mit mindestens vier Ziffern geschrieben. Jahr 0 UM ist 2026 gregorianisch; jedes UM-Jahr beginnt am 1. Januar, in koordinierter Weltzeit. Nach 9999 wird das Jahresfeld länger. Die letzten zwölf Zeichen sind elf zugewiesene Zeichen und ein Prüfzeichen, immer das letzte. Die Schriftform verwendet Großbuchstaben.',
      ],
    },
    {
      heading: '4. Alphabet',
      paragraphs: [
        'Der Körper verwendet nur diese Zeichen, in dieser Reihenfolge, mit dem Wert 0 bis 28:',
        UM_SPEC_ALPHABET,
        'Die Vokale A, E, I, O, U und der Buchstabe L sind ausgeschlossen. Das Jahresfeld verwendet nur die Ziffern 0 bis 9.',
      ],
    },
    {
      heading: '5. Vergleich und Normalisierung',
      paragraphs: [
        'Zwei Kennungen sind dieselbe, wenn sie nach dem Entfernen von Bindestrichen und Leerzeichen und nach einheitlicher Groß- und Kleinschreibung übereinstimmen. UM-0000-K3NQ-7FX2-MVP4, UM0000K3NQ7FX2MVP4 und um-0000-k3nq-7fx2-mvp4 sind dieselbe Kennung. Ein System, das sie annimmt, muss alle diese Formen annehmen.',
      ],
    },
    {
      heading: '6. Das Prüfzeichen',
      paragraphs: [
        'Das letzte Zeichen wird aus allen Jahresziffern und den elf Zeichen des Körpers berechnet, ohne die Buchstaben UM und ohne die Bindestriche. Die Positionen werden ab eins gezählt. Jedes Zeichen wird sein Alphabetwert, mit der Position multipliziert, die Produkte werden addiert, die Summe durch 29 geteilt, der Rest bleibt. Das Prüfzeichen ist das Alphabetzeichen an diesem Rest.',
        '29 ist eine Primzahl: die Prüfung erkennt immer den Ersatz eines einzelnen Zeichens und den Tausch zweier benachbarter Zeichen. Bei UM-0000-K3NQ-7FX2-MVP4 ist die Summe der Produkte 1802 und der Rest der Teilung durch 29 ist 4, also ist das letzte Zeichen 4. Hat das Jahr mehr als vier Ziffern, beginnen die Positionen trotzdem bei der ersten Ziffer.',
      ],
    },
    {
      heading: '7. Prüfvektoren',
      paragraphs: [
        'Jede Umsetzung muss genau diese Kennungen erzeugen. Die Vektoren mit fünfstelliger Jahreszahl gibt es, damit ein Programm, das vier Ziffern voraussetzt, am Tag seiner Entstehung scheitert und nicht in zehntausend Jahren.',
      ],
    },
    {
      heading: '8. Vergaberegeln',
      paragraphs: [
        'Die Kennung wird bei der Erstellung des Blattes vergeben und nie geändert und nie neu vergeben, auch wenn das Blatt gelöscht wird. Der Körper aus elf Zeichen ist zufällig und enthält keinen Namen, keine Daten, keinen Ort und keine laufende Nummer. Die Eindeutigkeit garantiert das Register: vor der Vergabe prüft das System, dass die Kennung noch nicht existiert.',
      ],
    },
    {
      heading: '9. Auflösung',
      paragraphs: [
        'Die kanonische Adresse ist https://id.biographylibrary.org/ gefolgt von der Kennung, mit oder ohne Bindestriche und in jeder Schreibung. Eine ausgegebene Kennung antwortet für immer. Ist das Blatt nicht einsehbar, sagt die Seite, dass die Kennung existiert und der Inhalt nicht verfügbar ist. Sie antwortet nie als fehlende Seite. Die Domäne kann sich ändern; die Zeichenfolge ist die Kennung.',
      ],
    },
    {
      heading: '10. Die ausgebende Stelle',
      paragraphs: [
        'UM-Kennungen gibt nur die Associazione Biography Library aus, Lugano, Kanton Tessin, Schweiz, Handelsregister CHE-416.014.530. Niemand sonst darf Zeichenfolgen ausgeben, die nach dieser Spezifikation mit UM- beginnen. Der Verein hält die Auflösung aufrecht, veröffentlicht diese Spezifikation und hinterlegt eine Kopie im Archiv.',
      ],
    },
    {
      heading: '11. Version der Spezifikation',
      paragraphs: [
        'Dies ist Version 1.0. Spätere Versionen dürfen Regeln ergänzen, aber bereits ausgegebene Kennungen nicht ungültig machen. Format, Alphabet und Prüfalgorithmus sind endgültig für jede Kennung, die mit UM- beginnt.',
      ],
    },
    {
      heading: '12. Wenn Biography Library aufhörte zu bestehen',
      paragraphs: [
        'Die Statuten sehen vor, dass das Archiv bei Auflösung einer verwahrenden Stelle anvertraut wird und der Code öffentlich bleibt. Die verwahrende Stelle übernimmt die Pflicht zur Auflösung. Tritt niemand nach, bleiben die Kennungen lesbar, weil alles Nötige zu ihrer Deutung in diesem Dokument steht.',
      ],
    },
    {
      heading: '13. Wo diese Spezifikation lebt',
      paragraphs: [
        'Sie ist auf der Website veröffentlicht, im öffentlichen Code-Repositorium hinterlegt, in vollständigen Archivexporten enthalten und zusammen mit den Biografien auf den Langzeitträgern wiedergegeben.',
      ],
    },
    {
      heading: '14. Referenzimplementierung',
      paragraphs: [
        'Der Referenzcode, der das Prüfzeichen berechnet, die Zeichenfolge normalisiert und die Vektoren dieser Seite prüft, liegt im öffentlichen Repositorium. Diese Seite ändert weder das Alphabet noch das Prüfzeichen, die Vektoren oder bereits ausgegebene Kennungen.',
      ],
    },
  ],
  vectorCaption: 'Prüfvektoren der Version 1.0',
  yearColumn: 'UM-Jahr',
  bodyColumn: 'Zugewiesener Körper',
  idColumn: 'Vollständige Kennung',
  resolveExample: 'https://id.biographylibrary.org/UM-0000-K3NQ-7FX2-MVP4',
};

const COPY: Record<Language, UmIdentifierPageCopy> = { it, en, fr, de };

export function umIdentifierPageCopy(language: Language): UmIdentifierPageCopy {
  return COPY[language] ?? COPY.en;
}
