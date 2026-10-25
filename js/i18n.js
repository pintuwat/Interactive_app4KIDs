// UI language for menus and the Parent corner ONLY. Child lessons are always English.
import { data } from './data.js';
import { settings } from './progress.js';

export const lang = () => settings().lang === 'th' ? 'th' : 'en';

/** Full string in the chosen UI language (falls back to English). */
export function t(key) {
  return data.i18n[lang()]?.[key] ?? data.i18n.en?.[key] ?? key;
}

/** Thai sub-label shown under English menu text when Thai is on (empty otherwise). */
export function sub(key) {
  return lang() === 'th' ? (data.i18n.th?.[key] || '') : '';
}
