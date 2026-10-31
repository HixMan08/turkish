import { useState } from 'react';
import type { LanguageId } from './data';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { About, Footer, LearningProcess, Testimonials } from './components/Sections';
import { Programs } from './components/Programs';
import { PhraseCard } from './components/PhraseCard';
import { FAQ } from './components/FAQ';
import { Contact } from './components/Contact';
import { useReveal } from './hooks/useReveal';
import { readDraft } from './storage';
export default function App() {
  const [selected, setSelected] = useState<LanguageId>(() => readDraft()?.language ?? 'turkish');
  useReveal();
  return <><a className="skip-link" href="#main">Перейти к содержимому</a><Header /><main id="main"><Hero /><div className="language-ribbon" aria-label="Три языка школы"><span lang="tr">Merhaba</span><i aria-hidden="true">✳</i><span lang="kk">Сәлем</span><i aria-hidden="true">✳</i><span>Здравствуйте</span><i aria-hidden="true">✳</i><small>РАЗНЫЕ ЯЗЫКИ. ОБЩИЙ МИР.</small></div><About /><Programs selected={selected} onSelect={setSelected} /><PhraseCard /><LearningProcess /><Testimonials /><FAQ /><Contact selected={selected} onSelect={setSelected} /></main><Footer /></>;
}
