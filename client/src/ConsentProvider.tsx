import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { CONSENT_VERSION, ConsentContext, deleteCookie, readConsent, writeCookie } from './consent';
export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState(readConsent); const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    // Remove the old demo's personal-data draft. No new personal data is stored locally.
    try { localStorage.removeItem('asyl-application-draft'); } catch { /* Storage may be disabled. */ }
    if (!consent?.analytics || navigator.doNotTrack === '1') return;
    const url = import.meta.env.VITE_ANALYTICS_SCRIPT_URL; const id = import.meta.env.VITE_ANALYTICS_WEBSITE_ID;
    if (!url || !id) return;
    let parsed: URL; try { parsed = new URL(url, location.origin); } catch { return; }
    if (parsed.protocol !== 'https:' && parsed.origin !== location.origin) return;
    const script = document.createElement('script'); script.id = 'asyl-analytics'; script.async = true; script.src = parsed.href; script.dataset.websiteId = id; document.head.append(script);
    return () => { script.remove(); };
  }, [consent]);
  return <ConsentContext value={{ consent, settingsOpen, openSettings: () => setSettingsOpen(true), closeSettings: () => setSettingsOpen(false), save: (functional, analytics) => {
    const next = { version: CONSENT_VERSION, date: new Date().toISOString(), necessary: true as const, functional, analytics };
    writeCookie('asyl_consent', JSON.stringify(next)); if (!functional) { deleteCookie('asyl_program'); deleteCookie('asyl_locale'); }
    const reload = Boolean(consent?.analytics && !analytics); setConsent(next); setSettingsOpen(false); if (reload) location.reload();
  } }}>{children}</ConsentContext>;
}
