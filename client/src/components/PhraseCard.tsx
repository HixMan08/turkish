import { useState } from 'react';
import { useContent } from '../content';
import { Arrow, SectionHeading } from './Shared';
export function PhraseCard() {
  const { phrases, loading } = useContent();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const phrase = phrases[index] ?? phrases[0];
  if (!phrase) return <section id="lesson" className="section container"><h2>Мини-урок</h2><p role="status">{loading ? "Загружаем фразы…" : "Фразы пока не добавлены."}</p></section>;
  return <section className="section container phrase-section" id="lesson" aria-labelledby="phrase-heading" data-reveal><div><SectionHeading eyebrow="03 / ПОПРОБУЙТЕ ПРЯМО СЕЙЧАС">Всего одна фраза.<br /><em>Уже немного ближе.</em></SectionHeading><p id="phrase-heading" className="section-description">Почувствуйте звучание турецкого.<br />Прочитайте фразу, попробуйте перевести<br />и откройте её значение.</p><div className="phrase-meta"><span>{String(index + 1).padStart(2, '0')} / {String(phrases.length).padStart(2, '0')}</span><span>ВАШ ПЕРВЫЙ МИНИ-УРОК</span></div></div><div className="phrase-card"><div className="phrase-card-top"><span lang="tr">TÜRKÇE</span><span aria-hidden="true">✳</span></div><div key={index} className="phrase-content" aria-live="polite" aria-atomic="true"><p className="phrase-word" lang="tr">{phrase.turkish}</p><p className="pronunciation">[ {phrase.transcription} ]</p><div id="phrase-answer" className={`phrase-answer${revealed ? ' revealed' : ''}`} aria-hidden={!revealed}><div><strong>{phrase.translation}</strong><p>{phrase.category}</p></div></div></div><div className="phrase-controls"><button className="text-link" type="button" aria-expanded={revealed} aria-controls="phrase-answer" onClick={() => setRevealed(!revealed)}>{revealed ? 'Скрыть перевод' : 'Показать перевод'}<span aria-hidden="true">{revealed ? '−' : '+'}</span></button><button className="next-phrase" type="button" onClick={() => { setIndex((index + 1) % phrases.length); setRevealed(false); }}>Следующая фраза <Arrow /></button></div></div></section>;
}
