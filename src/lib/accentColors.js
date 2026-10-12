// Accent color presets. Each key needs a [data-accent="<key>"] block in
// src/index.css (blue is the :root default); swatch is the 600 shade.
export const ACCENT_COLORS = [
  { key: 'blue',   label: 'Ocean Blue',      swatch: '#0072bf' },
  { key: 'green',  label: 'Forest Green',    swatch: '#3a653f' },
  { key: 'purple', label: 'Plum Purple',     swatch: '#642e97' },
  { key: 'rose',   label: 'Burgundy Rose',   swatch: '#a82442' },
  { key: 'slate',  label: 'Slate',           swatch: '#475569' },
  { key: 'teal',   label: 'Lagoon Teal',     swatch: '#0f766e' },
  { key: 'indigo', label: 'Twilight Indigo', swatch: '#4f46e5' },
  { key: 'navy',   label: 'Midnight Navy',   swatch: '#284686' },
  { key: 'violet', label: 'Violet',          swatch: '#7c3aed' },
  { key: 'berry',  label: 'Berry Pink',      swatch: '#db2777' },
  { key: 'cherry', label: 'Cherry Red',      swatch: '#dc2626' },
  { key: 'coral',  label: 'Sunset Coral',    swatch: '#cd462d' },
  { key: 'copper', label: 'Copper',          swatch: '#c2410c' },
  { key: 'gold',   label: 'Harvest Gold',    swatch: '#b45309' },
  { key: 'cocoa',  label: 'Cocoa Brown',     swatch: '#7a553a' },
]

export const accentSwatch = (key) => ACCENT_COLORS.find(c => c.key === key)?.swatch || ACCENT_COLORS[0].swatch
export const accentLabel  = (key) => ACCENT_COLORS.find(c => c.key === key)?.label || key
