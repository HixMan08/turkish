import type { LanguageId } from './data';
export interface ApplicationDraft { name: string; phone: string; language: LanguageId; }
export function readDraft(): ApplicationDraft | null {
  try {
    const raw = localStorage.getItem('asyl-application-draft');
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || !('name' in value) || !('phone' in value) || !('language' in value)) return null;
    if (typeof value.name !== 'string' || typeof value.phone !== 'string') return null;
    if (value.language !== 'turkish' && value.language !== 'kazakh' && value.language !== 'russian') return null;
    return { name: value.name.slice(0, 60), phone: value.phone.slice(0, 30), language: value.language };
  } catch { return null; }
}
