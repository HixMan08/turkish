import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from './api';
import { ContentContext } from './content';
import type { FaqItem, Phrase, Program, Review } from './types';
export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<{ programs: Program[]; phrases: Phrase[]; faqs: FaqItem[]; reviews: Review[] }>({ programs: [], phrases: [], faqs: [], reviews: [] });
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([api<{ data: Program[] }>('/programs', { signal: controller.signal }), api<{ data: Phrase[] }>('/phrases', { signal: controller.signal }), api<{ data: FaqItem[] }>('/faq', { signal: controller.signal }), api<{ data: Review[] }>('/reviews', { signal: controller.signal })]).then(([p, ph, f, r]) => { if (!controller.signal.aborted) { setContent({ programs: p.data, phrases: ph.data, faqs: f.data, reviews: r.data }); setError(''); } }).catch((e: unknown) => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Не удалось загрузить программы'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  return <ContentContext value={{ ...content, loading, error, retry: () => { setLoading(true); setAttempt(value => value + 1); } }}>{children}</ContentContext>;
}
