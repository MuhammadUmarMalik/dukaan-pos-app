export const validEmail = (s: string) => /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(s.trim());
/** At least 8 characters with a letter and a digit (set the same minimum in the Firebase console). */
export const validPassword = (s: string) => s.length >= 8 && s.length <= 72 && /[A-Za-z]/.test(s) && /\d/.test(s);
