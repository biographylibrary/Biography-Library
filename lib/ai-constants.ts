export interface AiSuggestion {
  id: string;
  original: string;
  suggestion: string;
  explanation: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface AiPrompt {
  prompt: string;
  starter: string;
}

export interface AiPanelState {
  type: 'grammar' | 'prompts' | 'summary' | null;
  loading: boolean;
  suggestions: AiSuggestion[];
  prompts: AiPrompt[];
  summary: string;
  error: string | null;
}

export const INITIAL_AI_STATE: AiPanelState = {
  type: null,
  loading: false,
  suggestions: [],
  prompts: [],
  summary: '',
  error: null,
};

const FALLBACK_PROMPTS_EN: Record<string, AiPrompt[]> = {
  childhood: [
    { prompt: 'Describe your earliest memory', starter: 'My earliest memory is of...' },
    { prompt: 'What was your childhood home like?', starter: 'The home I grew up in...' },
    { prompt: 'Who was your best friend growing up?', starter: 'My closest friend as a child...' },
    { prompt: 'What games did you play as a child?', starter: 'As a child, I loved playing...' },
    { prompt: 'What was your favorite family tradition?', starter: 'Every year, our family would...' },
  ],
  family: [
    { prompt: 'Tell me about your parents', starter: 'My parents were...' },
    { prompt: 'What family traditions were most important?', starter: 'The tradition that meant the most...' },
    { prompt: 'Describe a typical family gathering', starter: 'When our family gathered together...' },
    { prompt: 'What values did your family instill in you?', starter: 'My family taught me to value...' },
    { prompt: 'Who was the most influential family member?', starter: 'The person who influenced me most...' },
  ],
  education: [
    { prompt: 'What was your favorite subject in school?', starter: 'I was always drawn to...' },
    { prompt: 'Describe a teacher who changed your life', starter: 'There was one teacher who...' },
    { prompt: 'What was your school like?', starter: 'My school was...' },
    { prompt: 'What did you dream of becoming?', starter: 'When I was young, I dreamed of...' },
    { prompt: 'What was your most memorable school experience?', starter: 'I will never forget the time...' },
  ],
  career: [
    { prompt: 'How did you choose your career path?', starter: 'My career began when...' },
    { prompt: 'What was your first job?', starter: 'My very first job was...' },
    { prompt: 'What accomplishment are you most proud of?', starter: 'The achievement I am most proud of...' },
    { prompt: 'Who was your most influential mentor?', starter: 'I was fortunate to learn from...' },
    { prompt: 'What challenges did you face at work?', starter: 'One of the biggest challenges I faced...' },
  ],
  'life-events': [
    { prompt: 'What moment changed the course of your life?', starter: 'Everything changed when...' },
    { prompt: 'Describe a moment of unexpected joy', starter: 'One of my happiest surprises was...' },
    { prompt: 'What historical event affected you personally?', starter: 'I remember when the world...' },
    { prompt: 'Describe a turning point in your life', starter: 'The moment I realized...' },
    { prompt: 'What adventure do you remember most vividly?', starter: 'The adventure that stands out most...' },
  ],
  relationships: [
    { prompt: 'How did you meet your partner?', starter: 'We first met when...' },
    { prompt: 'What does love mean to you?', starter: 'To me, love has always meant...' },
    { prompt: 'Describe your closest friendship', starter: 'My dearest friend and I...' },
    { prompt: 'What have relationships taught you?', starter: 'Through my relationships, I learned...' },
    { prompt: 'Describe a moment of deep connection', starter: 'I felt truly connected when...' },
  ],
  challenges: [
    { prompt: 'What was the hardest thing you ever faced?', starter: 'The most difficult time in my life...' },
    { prompt: 'How did you overcome a major obstacle?', starter: 'I found the strength to overcome...' },
    { prompt: 'What failure taught you the most?', starter: 'The failure that taught me the most...' },
    { prompt: 'What advice would you give your younger self?', starter: 'If I could tell my younger self...' },
    { prompt: 'How did hardship shape who you are?', starter: 'Going through that experience made me...' },
  ],
  passions: [
    { prompt: 'What hobby brings you the most joy?', starter: 'Nothing makes me happier than...' },
    { prompt: 'How did you discover your passion?', starter: 'I first discovered my love for...' },
    { prompt: 'What could you spend hours doing?', starter: 'I could spend all day...' },
    { prompt: 'What skill did you work hardest to develop?', starter: 'The skill I worked hardest on...' },
    { prompt: 'What do you wish more people appreciated?', starter: 'I wish more people understood...' },
  ],
  legacy: [
    { prompt: 'What do you want to be remembered for?', starter: 'I hope to be remembered as...' },
    { prompt: 'What wisdom would you pass on?', starter: 'If I could share one piece of wisdom...' },
    { prompt: 'What are you most grateful for?', starter: 'Above all, I am grateful for...' },
    { prompt: 'How do you hope the world will change?', starter: 'My hope for the future is...' },
    { prompt: 'What message do you have for future generations?', starter: 'To those who come after me...' },
  ],
};

const FALLBACK_PROMPTS_IT: Record<string, AiPrompt[]> = {
  childhood: [
    { prompt: 'Descrivi il tuo primo ricordo', starter: 'Il mio primo ricordo \u00e8...' },
    { prompt: 'Com\'era la casa della tua infanzia?', starter: 'La casa in cui sono cresciuto...' },
    { prompt: 'Chi era il tuo migliore amico da bambino?', starter: 'Il mio amico pi\u00f9 caro da bambino...' },
    { prompt: 'A quali giochi giocavi da bambino?', starter: 'Da bambino, adoravo giocare a...' },
    { prompt: 'Qual era la tua tradizione familiare preferita?', starter: 'Ogni anno, la nostra famiglia...' },
  ],
  family: [
    { prompt: 'Parlami dei tuoi genitori', starter: 'I miei genitori erano...' },
    { prompt: 'Quali tradizioni familiari erano pi\u00f9 importanti?', starter: 'La tradizione che significava di pi\u00f9...' },
    { prompt: 'Descrivi un tipico ritrovo familiare', starter: 'Quando la nostra famiglia si riuniva...' },
    { prompt: 'Quali valori ti ha trasmesso la tua famiglia?', starter: 'La mia famiglia mi ha insegnato a dare valore a...' },
    { prompt: 'Chi \u00e8 stato il familiare pi\u00f9 influente?', starter: 'La persona che mi ha influenzato di pi\u00f9...' },
  ],
  education: [
    { prompt: 'Qual era la tua materia preferita a scuola?', starter: 'Sono sempre stato attratto da...' },
    { prompt: 'Descrivi un insegnante che ha cambiato la tua vita', starter: 'C\'era un insegnante che...' },
    { prompt: 'Com\'era la tua scuola?', starter: 'La mia scuola era...' },
    { prompt: 'Cosa sognavi di diventare?', starter: 'Da giovane, sognavo di...' },
    { prompt: 'Qual \u00e8 stata la tua esperienza scolastica pi\u00f9 memorabile?', starter: 'Non dimenticher\u00f2 mai la volta in cui...' },
  ],
  career: [
    { prompt: 'Come hai scelto la tua carriera?', starter: 'La mia carriera \u00e8 iniziata quando...' },
    { prompt: 'Qual \u00e8 stato il tuo primo lavoro?', starter: 'Il mio primissimo lavoro era...' },
    { prompt: 'Di quale risultato sei pi\u00f9 orgoglioso?', starter: 'Il risultato di cui sono pi\u00f9 orgoglioso...' },
    { prompt: 'Chi \u00e8 stato il tuo mentore pi\u00f9 influente?', starter: 'Ho avuto la fortuna di imparare da...' },
    { prompt: 'Quali sfide hai affrontato nel lavoro?', starter: 'Una delle sfide pi\u00f9 grandi che ho affrontato...' },
  ],
  'life-events': [
    { prompt: 'Quale momento ha cambiato il corso della tua vita?', starter: 'Tutto \u00e8 cambiato quando...' },
    { prompt: 'Descrivi un momento di gioia inaspettata', starter: 'Una delle mie sorprese pi\u00f9 belle \u00e8 stata...' },
    { prompt: 'Quale evento storico ti ha toccato personalmente?', starter: 'Ricordo quando il mondo...' },
    { prompt: 'Descrivi un punto di svolta nella tua vita', starter: 'Il momento in cui ho capito...' },
    { prompt: 'Quale avventura ricordi pi\u00f9 vividamente?', starter: 'L\'avventura che ricordo meglio...' },
  ],
  relationships: [
    { prompt: 'Come hai conosciuto il tuo partner?', starter: 'Ci siamo incontrati per la prima volta quando...' },
    { prompt: 'Cosa significa l\'amore per te?', starter: 'Per me, l\'amore ha sempre significato...' },
    { prompt: 'Descrivi la tua amicizia pi\u00f9 stretta', starter: 'Il mio amico pi\u00f9 caro e io...' },
    { prompt: 'Cosa ti hanno insegnato le relazioni?', starter: 'Attraverso le mie relazioni, ho imparato...' },
    { prompt: 'Descrivi un momento di profonda connessione', starter: 'Mi sono sentito veramente connesso quando...' },
  ],
  challenges: [
    { prompt: 'Qual \u00e8 stata la cosa pi\u00f9 difficile che hai affrontato?', starter: 'Il periodo pi\u00f9 difficile della mia vita...' },
    { prompt: 'Come hai superato un grande ostacolo?', starter: 'Ho trovato la forza di superare...' },
    { prompt: 'Quale fallimento ti ha insegnato di pi\u00f9?', starter: 'Il fallimento che mi ha insegnato di pi\u00f9...' },
    { prompt: 'Che consiglio daresti al te stesso pi\u00f9 giovane?', starter: 'Se potessi dire al me stesso pi\u00f9 giovane...' },
    { prompt: 'Come le difficolt\u00e0 hanno plasmato chi sei?', starter: 'Attraversare quell\'esperienza mi ha reso...' },
  ],
  passions: [
    { prompt: 'Quale hobby ti d\u00e0 pi\u00f9 gioia?', starter: 'Niente mi rende pi\u00f9 felice di...' },
    { prompt: 'Come hai scoperto la tua passione?', starter: 'Ho scoperto per la prima volta il mio amore per...' },
    { prompt: 'Cosa potresti fare per ore?', starter: 'Potrei passare tutto il giorno a...' },
    { prompt: 'Quale abilit\u00e0 hai lavorato di pi\u00f9 per sviluppare?', starter: 'L\'abilit\u00e0 su cui ho lavorato di pi\u00f9...' },
    { prompt: 'Cosa vorresti che pi\u00f9 persone apprezzassero?', starter: 'Vorrei che pi\u00f9 persone capissero...' },
  ],
  legacy: [
    { prompt: 'Per cosa vuoi essere ricordato?', starter: 'Spero di essere ricordato come...' },
    { prompt: 'Quale saggezza trasmetteresti?', starter: 'Se potessi condividere un consiglio...' },
    { prompt: 'Per cosa sei pi\u00f9 grato?', starter: 'Soprattutto, sono grato per...' },
    { prompt: 'Come speri che il mondo cambier\u00e0?', starter: 'La mia speranza per il futuro \u00e8...' },
    { prompt: 'Che messaggio hai per le generazioni future?', starter: 'A coloro che verranno dopo di me...' },
  ],
};

const FALLBACK_PROMPTS_FR: Record<string, AiPrompt[]> = {
  childhood: [
    { prompt: 'D\u00e9crivez votre premier souvenir', starter: 'Mon premier souvenir est...' },
    { prompt: 'Comment \u00e9tait la maison de votre enfance ?', starter: 'La maison o\u00f9 j\'ai grandi...' },
    { prompt: 'Qui \u00e9tait votre meilleur ami d\'enfance ?', starter: 'Mon ami le plus proche quand j\'\u00e9tais enfant...' },
    { prompt: '\u00c0 quels jeux jouiez-vous enfant ?', starter: 'Quand j\'\u00e9tais enfant, j\'adorais jouer \u00e0...' },
    { prompt: 'Quelle \u00e9tait votre tradition familiale pr\u00e9f\u00e9r\u00e9e ?', starter: 'Chaque ann\u00e9e, notre famille...' },
  ],
  family: [
    { prompt: 'Parlez-moi de vos parents', starter: 'Mes parents \u00e9taient...' },
    { prompt: 'Quelles traditions familiales \u00e9taient les plus importantes ?', starter: 'La tradition qui comptait le plus...' },
    { prompt: 'D\u00e9crivez une r\u00e9union de famille typique', starter: 'Quand notre famille se r\u00e9unissait...' },
    { prompt: 'Quelles valeurs votre famille vous a-t-elle transmises ?', starter: 'Ma famille m\'a appris \u00e0 valoriser...' },
    { prompt: 'Qui a \u00e9t\u00e9 le membre de la famille le plus influent ?', starter: 'La personne qui m\'a le plus influenc\u00e9...' },
  ],
  education: [
    { prompt: 'Quelle \u00e9tait votre mati\u00e8re pr\u00e9f\u00e9r\u00e9e \u00e0 l\'\u00e9cole ?', starter: 'J\'\u00e9tais toujours attir\u00e9 par...' },
    { prompt: 'D\u00e9crivez un enseignant qui a chang\u00e9 votre vie', starter: 'Il y avait un enseignant qui...' },
    { prompt: 'Comment \u00e9tait votre \u00e9cole ?', starter: 'Mon \u00e9cole \u00e9tait...' },
    { prompt: 'De quoi r\u00eaviez-vous de devenir ?', starter: 'Quand j\'\u00e9tais jeune, je r\u00eavais de...' },
    { prompt: 'Quelle a \u00e9t\u00e9 votre exp\u00e9rience scolaire la plus m\u00e9morable ?', starter: 'Je n\'oublierai jamais la fois o\u00f9...' },
  ],
  career: [
    { prompt: 'Comment avez-vous choisi votre carri\u00e8re ?', starter: 'Ma carri\u00e8re a commenc\u00e9 quand...' },
    { prompt: 'Quel \u00e9tait votre premier emploi ?', starter: 'Mon tout premier emploi \u00e9tait...' },
    { prompt: 'De quelle r\u00e9alisation \u00eates-vous le plus fier ?', starter: 'La r\u00e9alisation dont je suis le plus fier...' },
    { prompt: 'Qui a \u00e9t\u00e9 votre mentor le plus influent ?', starter: 'J\'ai eu la chance d\'apprendre de...' },
    { prompt: 'Quels d\u00e9fis avez-vous rencontr\u00e9s au travail ?', starter: 'L\'un des plus grands d\u00e9fis que j\'ai rencontr\u00e9s...' },
  ],
  'life-events': [
    { prompt: 'Quel moment a chang\u00e9 le cours de votre vie ?', starter: 'Tout a chang\u00e9 quand...' },
    { prompt: 'D\u00e9crivez un moment de joie inattendue', starter: 'L\'une de mes plus belles surprises a \u00e9t\u00e9...' },
    { prompt: 'Quel \u00e9v\u00e9nement historique vous a touch\u00e9 personnellement ?', starter: 'Je me souviens quand le monde...' },
    { prompt: 'D\u00e9crivez un tournant dans votre vie', starter: 'Le moment o\u00f9 j\'ai r\u00e9alis\u00e9...' },
    { prompt: 'Quelle aventure vous rappel\u00e9z-vous le plus vivement ?', starter: 'L\'aventure qui me marque le plus...' },
  ],
  relationships: [
    { prompt: 'Comment avez-vous rencontr\u00e9 votre partenaire ?', starter: 'Nous nous sommes rencontr\u00e9s pour la premi\u00e8re fois quand...' },
    { prompt: 'Que signifie l\'amour pour vous ?', starter: 'Pour moi, l\'amour a toujours signifi\u00e9...' },
    { prompt: 'D\u00e9crivez votre amiti\u00e9 la plus proche', starter: 'Mon ami le plus cher et moi...' },
    { prompt: 'Qu\'est-ce que les relations vous ont appris ?', starter: '\u00c0 travers mes relations, j\'ai appris...' },
    { prompt: 'D\u00e9crivez un moment de connexion profonde', starter: 'Je me suis senti vraiment connect\u00e9 quand...' },
  ],
  challenges: [
    { prompt: 'Quelle a \u00e9t\u00e9 la chose la plus difficile que vous ayez v\u00e9cue ?', starter: 'La p\u00e9riode la plus difficile de ma vie...' },
    { prompt: 'Comment avez-vous surmont\u00e9 un obstacle majeur ?', starter: 'J\'ai trouv\u00e9 la force de surmonter...' },
    { prompt: 'Quel \u00e9chec vous a le plus appris ?', starter: 'L\'\u00e9chec qui m\'a le plus appris...' },
    { prompt: 'Quel conseil donneriez-vous \u00e0 votre jeune vous ?', starter: 'Si je pouvais dire \u00e0 mon jeune moi...' },
    { prompt: 'Comment les difficult\u00e9s ont-elles fa\u00e7onn\u00e9 qui vous \u00eates ?', starter: 'Traverser cette exp\u00e9rience m\'a rendu...' },
  ],
  passions: [
    { prompt: 'Quel passe-temps vous apporte le plus de joie ?', starter: 'Rien ne me rend plus heureux que...' },
    { prompt: 'Comment avez-vous d\u00e9couvert votre passion ?', starter: 'J\'ai d\u00e9couvert mon amour pour...' },
    { prompt: 'Que pourriez-vous faire pendant des heures ?', starter: 'Je pourrais passer toute la journ\u00e9e \u00e0...' },
    { prompt: 'Quelle comp\u00e9tence avez-vous travaill\u00e9 le plus dur pour d\u00e9velopper ?', starter: 'La comp\u00e9tence sur laquelle j\'ai le plus travaill\u00e9...' },
    { prompt: 'Qu\'aimeriez-vous que plus de gens appr\u00e9cient ?', starter: 'J\'aimerais que plus de gens comprennent...' },
  ],
  legacy: [
    { prompt: 'Pour quoi voulez-vous \u00eatre rappel\u00e9 ?', starter: 'J\'esp\u00e8re \u00eatre rappel\u00e9 comme...' },
    { prompt: 'Quelle sagesse transmettriez-vous ?', starter: 'Si je pouvais partager un conseil...' },
    { prompt: 'De quoi \u00eates-vous le plus reconnaissant ?', starter: 'Par-dessus tout, je suis reconnaissant pour...' },
    { prompt: 'Comment esp\u00e9rez-vous que le monde changera ?', starter: 'Mon espoir pour l\'avenir est...' },
    { prompt: 'Quel message avez-vous pour les g\u00e9n\u00e9rations futures ?', starter: '\u00c0 ceux qui viendront apr\u00e8s moi...' },
  ],
};

const FALLBACK_PROMPTS_DE: Record<string, AiPrompt[]> = {
  childhood: [
    { prompt: 'Beschreiben Sie Ihre fr\u00fcheste Erinnerung', starter: 'Meine fr\u00fcheste Erinnerung ist...' },
    { prompt: 'Wie war Ihr Elternhaus?', starter: 'Das Haus, in dem ich aufgewachsen bin...' },
    { prompt: 'Wer war Ihr bester Freund als Kind?', starter: 'Mein engster Freund als Kind...' },
    { prompt: 'Welche Spiele haben Sie als Kind gespielt?', starter: 'Als Kind liebte ich es zu spielen...' },
    { prompt: 'Was war Ihre liebste Familientradition?', starter: 'Jedes Jahr hat unsere Familie...' },
  ],
  family: [
    { prompt: 'Erz\u00e4hlen Sie mir von Ihren Eltern', starter: 'Meine Eltern waren...' },
    { prompt: 'Welche Familientraditionen waren am wichtigsten?', starter: 'Die Tradition, die am meisten bedeutete...' },
    { prompt: 'Beschreiben Sie ein typisches Familientreffen', starter: 'Wenn unsere Familie zusammenkam...' },
    { prompt: 'Welche Werte hat Ihnen Ihre Familie vermittelt?', starter: 'Meine Familie lehrte mich zu sch\u00e4tzen...' },
    { prompt: 'Wer war das einflussreichste Familienmitglied?', starter: 'Die Person, die mich am meisten beeinflusst hat...' },
  ],
  education: [
    { prompt: 'Was war Ihr Lieblingsfach in der Schule?', starter: 'Ich f\u00fchlte mich immer angezogen von...' },
    { prompt: 'Beschreiben Sie einen Lehrer, der Ihr Leben ver\u00e4ndert hat', starter: 'Es gab einen Lehrer, der...' },
    { prompt: 'Wie war Ihre Schule?', starter: 'Meine Schule war...' },
    { prompt: 'Wovon haben Sie getr\u00e4umt zu werden?', starter: 'Als ich jung war, tr\u00e4umte ich davon...' },
    { prompt: 'Was war Ihre denkw\u00fcrdigste Schulerfahrung?', starter: 'Ich werde nie die Zeit vergessen, als...' },
  ],
  career: [
    { prompt: 'Wie haben Sie Ihren Berufsweg gew\u00e4hlt?', starter: 'Meine Karriere begann, als...' },
    { prompt: 'Was war Ihr erster Job?', starter: 'Mein allererster Job war...' },
    { prompt: 'Auf welche Leistung sind Sie am stolzesten?', starter: 'Die Leistung, auf die ich am stolzesten bin...' },
    { prompt: 'Wer war Ihr einflussreichster Mentor?', starter: 'Ich hatte das Gl\u00fcck, von ... zu lernen...' },
    { prompt: 'Welche Herausforderungen hatten Sie bei der Arbeit?', starter: 'Eine der gr\u00f6\u00dften Herausforderungen...' },
  ],
  'life-events': [
    { prompt: 'Welcher Moment hat den Verlauf Ihres Lebens ver\u00e4ndert?', starter: 'Alles \u00e4nderte sich, als...' },
    { prompt: 'Beschreiben Sie einen Moment unerwarteter Freude', starter: 'Eine meiner sch\u00f6nsten \u00dcberraschungen war...' },
    { prompt: 'Welches historische Ereignis hat Sie pers\u00f6nlich betroffen?', starter: 'Ich erinnere mich, als die Welt...' },
    { prompt: 'Beschreiben Sie einen Wendepunkt in Ihrem Leben', starter: 'Der Moment, als ich erkannte...' },
    { prompt: 'An welches Abenteuer erinnern Sie sich am lebhaftesten?', starter: 'Das Abenteuer, das am meisten hervorsticht...' },
  ],
  relationships: [
    { prompt: 'Wie haben Sie Ihren Partner kennengelernt?', starter: 'Wir haben uns zum ersten Mal getroffen, als...' },
    { prompt: 'Was bedeutet Liebe f\u00fcr Sie?', starter: 'F\u00fcr mich hat Liebe immer bedeutet...' },
    { prompt: 'Beschreiben Sie Ihre engste Freundschaft', starter: 'Mein liebster Freund und ich...' },
    { prompt: 'Was haben Beziehungen Ihnen beigebracht?', starter: 'Durch meine Beziehungen habe ich gelernt...' },
    { prompt: 'Beschreiben Sie einen Moment tiefer Verbundenheit', starter: 'Ich f\u00fchlte mich wirklich verbunden, als...' },
  ],
  challenges: [
    { prompt: 'Was war das Schwerste, dem Sie je begegnet sind?', starter: 'Die schwierigste Zeit meines Lebens...' },
    { prompt: 'Wie haben Sie ein gro\u00dfes Hindernis \u00fcberwunden?', starter: 'Ich fand die Kraft zu \u00fcberwinden...' },
    { prompt: 'Welches Scheitern hat Ihnen am meisten beigebracht?', starter: 'Das Scheitern, das mich am meisten gelehrt hat...' },
    { prompt: 'Welchen Rat w\u00fcrden Sie Ihrem j\u00fcngeren Ich geben?', starter: 'Wenn ich meinem j\u00fcngeren Ich sagen k\u00f6nnte...' },
    { prompt: 'Wie haben Schwierigkeiten gepr\u00e4gt, wer Sie sind?', starter: 'Diese Erfahrung durchzumachen hat mich...' },
  ],
  passions: [
    { prompt: 'Welches Hobby bringt Ihnen die meiste Freude?', starter: 'Nichts macht mich gl\u00fccklicher als...' },
    { prompt: 'Wie haben Sie Ihre Leidenschaft entdeckt?', starter: 'Ich entdeckte zum ersten Mal meine Liebe zu...' },
    { prompt: 'Was k\u00f6nnten Sie stundenlang tun?', starter: 'Ich k\u00f6nnte den ganzen Tag...' },
    { prompt: 'Welche F\u00e4higkeit haben Sie am h\u00e4rtesten erarbeitet?', starter: 'Die F\u00e4higkeit, an der ich am h\u00e4rtesten gearbeitet habe...' },
    { prompt: 'Was w\u00fcnschen Sie sich, dass mehr Menschen sch\u00e4tzen?', starter: 'Ich w\u00fcnschte, mehr Menschen w\u00fcrden verstehen...' },
  ],
  legacy: [
    { prompt: 'Wof\u00fcr m\u00f6chten Sie in Erinnerung bleiben?', starter: 'Ich hoffe, in Erinnerung zu bleiben als...' },
    { prompt: 'Welche Weisheit w\u00fcrden Sie weitergeben?', starter: 'Wenn ich eine Weisheit teilen k\u00f6nnte...' },
    { prompt: 'Wof\u00fcr sind Sie am dankbarsten?', starter: 'Vor allem bin ich dankbar f\u00fcr...' },
    { prompt: 'Wie hoffen Sie, dass sich die Welt ver\u00e4ndern wird?', starter: 'Meine Hoffnung f\u00fcr die Zukunft ist...' },
    { prompt: 'Welche Botschaft haben Sie f\u00fcr zuk\u00fcnftige Generationen?', starter: 'An diejenigen, die nach mir kommen...' },
  ],
};

const ALL_FALLBACK_PROMPTS: Record<string, Record<string, AiPrompt[]>> = {
  en: FALLBACK_PROMPTS_EN,
  it: FALLBACK_PROMPTS_IT,
  fr: FALLBACK_PROMPTS_FR,
  de: FALLBACK_PROMPTS_DE,
};

export function getFallbackPrompts(language: string = 'en'): Record<string, AiPrompt[]> {
  return ALL_FALLBACK_PROMPTS[language] || ALL_FALLBACK_PROMPTS['en'];
}

export const FALLBACK_PROMPTS = FALLBACK_PROMPTS_EN;
