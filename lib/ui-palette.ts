/**
 * Palette ufficiale e classi per avvisi / chip.
 *
 * Sette regole:
 * 1. Un avviso = `notice tone-<tipo>` (info|success|warning|danger). Un chip = `tone-<tipo>`
 *    più forma, o Badge con variante tone. Niente altre combinazioni bg/border/text-brand-* per questi usi.
 * 2. Bordo avviso = sempre `border-border` (1px, senza opacità), mai colorato.
 * 3. Testo avviso = brand-ink in chiaro, brand-beigeLight in scuro (da `.tone-*`). Vietati
 *    `text-muted-foreground` e testi colorati dentro un avviso; gerarchia solo con la dimensione.
 * 4. Colori chiari (blue, greenLight, mustard*, beigeLight, paper) non come testo/icone su fondo
 *    chiaro; solo con `dark:` o su fondo scuro. Su chiaro: ink, wine, wineDark, greenDark.
 * 5. Opacità Tailwind ammesse: 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95. Mai 8, 12, 15, 35, 45, 55, 65.
 * 6. Niente scale Tailwind (amber, emerald, red, …) né esadecimali fuori palette nei componenti UI.
 * 7. Superfici e testo secondario: solo token (`bg-background`, `bg-card`, `bg-popover`, `bg-muted`,
 *    `text-foreground`, `text-muted-foreground`), mai grigi in esadecimale. In scuro scheda #313535,
 *    fondo riempito #404444, testo secondario #B8B8B8; le coppie le fissa `theme-contrast.test.ts`.
 *    Un chip sopra una foto usa anche `tone-on-image`.
 */
export const brandHex = {
  ink: '#121212',
  paper: '#FFFFFF',
  beigeLight: '#FDFBF7',
  beigeBg: '#ECE9E4',
  greenLight: '#C8DFBE',
  greenDark: '#5E685A',
  blue: '#C4DAEB',
  mustardLight: '#EDE4B9',
  mustardDark: '#DDCF88',
  wine: '#944454',
  wineDark: '#6D323E',
} as const;

/** Classi per riquadri di avviso (fondo + bordo neutro + testo). */
export const uiCallout = {
  warning: 'notice tone-warning',
  info: 'notice tone-info',
  success: 'notice tone-success',
  danger: 'notice tone-danger',
} as const;

/** Classi tone senza raggio notice — per chip / badge. */
export const uiTone = {
  warning: 'tone-warning',
  info: 'tone-info',
  success: 'tone-success',
  danger: 'tone-danger',
} as const;
