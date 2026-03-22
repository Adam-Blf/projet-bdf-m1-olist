/**
 * Olist BDF demo - shared theme tokens
 *
 * Couleurs alignées avec la palette du rapport (bleu République FR + teal +
 * gris slate) et la typo Plus Jakarta Sans + JetBrains Mono utilisées dans
 * le portfolio d'Adam.
 */
export const theme = {
  navy:    "#000091",
  teal:    "#00897B",
  red:     "#E11D48",
  green:   "#10B981",
  amber:   "#F59E0B",
  ink:     "#0f172a",
  text:    "#1f2937",
  muted:   "#64748b",
  border:  "#cbd5e1",
  bg:      "#f8fafc",
  bgDark:  "#0b1220",
} as const;

export const fonts = {
  display: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
  mono:    '"JetBrains Mono", "Fira Code", monospace',
} as const;
