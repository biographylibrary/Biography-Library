/**
 * Official UI colors (single source of truth with tailwind.config `brand.*`).
 * Use `brand-*` Tailwind classes for alerts, banners, dialogs, badges — do not introduce
 * amber/sky/emerald/red/orange Tailwind scales for these surfaces.
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

/** Precomposed class strings for common callout types (optional import; prefer `brand-*` in className). */
export const uiCallout = {
  warning:
    'bg-brand-mustardLight/45 border border-brand-mustardDark/40 text-brand-ink dark:bg-brand-mustardDark/20 dark:border-brand-mustardDark/50 dark:text-brand-beigeLight',
  info: 'bg-brand-blue/25 border border-brand-blue/60 text-brand-ink dark:bg-brand-blue/15 dark:border-brand-blue/45 dark:text-brand-beigeLight',
  success:
    'bg-brand-greenLight/45 border border-brand-greenLight text-brand-greenDark dark:bg-brand-greenLight/15 dark:border-brand-greenDark/50 dark:text-brand-greenLight',
  danger:
    'bg-brand-wine/10 border border-brand-wine/35 text-brand-wineDark dark:bg-brand-wine/20 dark:border-brand-wine/45 dark:text-brand-beigeLight',
} as const;
