import { lazy, Suspense, useState } from 'react';
import type { LanguageId } from './data';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { About, Footer, LearningProcess, Testimonials } from './components/Sections';
import { Programs } from './components/Programs';
import { PhraseCard } from './components/PhraseCard';
import { FAQ } from './components/FAQ';
import { Contact } from './components/Contact';
import { useReveal } from './hooks/useReveal';
import { ContentProvider } from './ContentProvider';
import { useContent } from './content';
import { ConsentProvider } from './ConsentProvider';
import { CookieBanner } from './CookieBanner';
import { readCookie, readConsent, useConsent, writeCookie } from './consent';
const LegalPage = lazy(() => import('./LegalPage').then(module => ({ default: module.LegalPage })));
import { ErrorBoundary, ErrorPage } from './ErrorPage';
const Admin = lazy(() => import('./admin/Admin').then(module => ({ default: module.Admin })));
function Home() {
  const { consent } = useConsent(); const { loading, error, retry } = useContent();
  const [selected, setSelected] = useState<LanguageId>(() => { const value = readConsent()?.functional ? readCookie('asyl_program') : null; return value === 'kazakh' || value === 'russian' ? value : 'turkish'; });
  const select = (language: LanguageId) => { setSelected(language); if (consent?.functional) writeCookie('asyl_program',language); };
  useReveal();
  return <><a className="skip-link" href="#main">Перейти к содержимому</a><Header /><main id="main"><Hero /><div className="language-ribbon" aria-label="Три языка школы"><span lang="tr">Merhaba</span><i aria-hidden="true">✳</i><span lang="kk">Сәлем</span><i aria-hidden="true">✳</i><span>Здравствуйте</span><i aria-hidden="true">✳</i><small>РАЗНЫЕ ЯЗЫКИ. ОБЩИЙ МИР.</small></div>{error && <div className="container api-notice" role="alert"><p>{error}</p><button className="cookie-secondary" type="button" onClick={retry}>Повторить загрузку</button></div>}{loading && <p className="container" role="status">Загружаем содержание школы…</p>}<About /><Programs selected={selected} onSelect={select} /><PhraseCard /><LearningProcess /><Testimonials /><FAQ /><Contact selected={selected} onSelect={select} /></main><Footer /></>;
}
export default function App() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, ''); const route = location.pathname.startsWith(base + '/') ? location.pathname.slice(base.length).replace(/\/$/, '') || '/' : location.pathname;
  let page;
  if (route === '/') page = <ContentProvider><Home /></ContentProvider>;
  else if (route === '/admin') page = <Admin />;
  else if (route === '/privacy' || route === '/cookies' || route === '/terms') page = <LegalPage page={route.slice(1) as 'privacy'|'cookies'|'terms'} />;
  else page = <ErrorPage notFound={route !== '/error'} />;
  return <ErrorBoundary><ConsentProvider><Suspense fallback={<main className="container legal-page"><p role="status">Загружаем страницу…</p></main>}>{page}</Suspense><CookieBanner /></ConsentProvider></ErrorBoundary>;
}
