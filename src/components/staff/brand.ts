import type { CSSProperties } from 'react';

/**
 * Equity Shoppers brand colors derived from public/equity-logo.png
 * Orange #F49121 · Purple #6A2B81 · Green #45B04A
 */
export const EQUITY_BRAND = {
  orange: '#F49121',
  purple: '#6A2B81',
  green: '#45B04A',
  black: '#0A0A0A',
  purpleDark: '#4A1D5C',
  purpleSoft: '#F3EAF7',
  greenSoft: '#E8F7E9',
  orangeSoft: '#FFF4E8',
} as const;

/** CSS custom properties for the staff portal shell */
export const staffBrandStyle = {
  ['--equity-orange']: EQUITY_BRAND.orange,
  ['--equity-purple']: EQUITY_BRAND.purple,
  ['--equity-green']: EQUITY_BRAND.green,
  ['--equity-black']: EQUITY_BRAND.black,
  ['--equity-purple-dark']: EQUITY_BRAND.purpleDark,
  ['--equity-purple-soft']: EQUITY_BRAND.purpleSoft,
  ['--equity-green-soft']: EQUITY_BRAND.greenSoft,
  ['--equity-orange-soft']: EQUITY_BRAND.orangeSoft,
} as CSSProperties;
