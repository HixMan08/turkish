import { createContext, useContext } from 'react';
export const CONSENT_VERSION = '2026-10-31';
export interface Consent { version: string; date: string; necessary: true; functional: boolean; analytics: boolean; }
export function readCookie(name: string): string | null { const value = document.cookie.split('; ').find(part => part.startsWith(name + '=')); try { return value ? decodeURIComponent(value.slice(name.length + 1)) : null; } catch { return null; } }
export function writeCookie(name: string, value: string, days = 365): void { document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${days * 86400}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`; }
export function deleteCookie(name: string): void { document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`; }
export function readConsent(): Consent | null {
  try { const raw = readCookie('asyl_consent'); if (!raw) return null; const value: unknown = JSON.parse(raw); if (typeof value !== 'object' || value === null || !('version' in value) || value.version !== CONSENT_VERSION || !('date' in value) || typeof value.date !== 'string' || !Number.isFinite(Date.parse(value.date)) || Date.now() - Date.parse(value.date) > 365 * 86400000 || !('functional' in value) || typeof value.functional !== 'boolean' || !('analytics' in value) || typeof value.analytics !== 'boolean') return null; return { version: CONSENT_VERSION, date: value.date, necessary: true, functional: value.functional, analytics: value.analytics }; } catch { return null; }
}
export interface ConsentContextValue { consent: Consent | null; settingsOpen: boolean; openSettings: () => void; closeSettings: () => void; save: (functional: boolean, analytics: boolean) => void; }
export const ConsentContext = createContext<ConsentContextValue | null>(null);
export function useConsent(): ConsentContextValue { const value = useContext(ConsentContext); if (!value) throw new Error('Consent provider is missing'); return value; }
export const routeHref = (route: string): string => import.meta.env.BASE_URL + route.replace(/^\//, '');
