import { useContent } from '../content';
import { routeHref, useConsent } from '../consent';
import { benefits, steps } from '../data';
import { Logo, SectionHeading } from './Shared';
export function About() {
  return <section className="section container" id="about" aria-labelledby="about-title" data-reveal><div className="about-heading"><div><p className="eyebrow">01 / ФИЛОСОФИЯ ASYL</p><h2 id="about-title">Не просто учить.<br /><em>Чувствовать язык.</em></h2></div><div className="about-copy"><p>Язык — это больше, чем слова и правила. Это возможность быть собой в новом окружении.</p><p>Мы видим ASYL как пространство, где обучение связано с вашей жизнью: с её планами, интересами и маленькими открытиями.</p></div></div><div className="benefit-grid">{benefits.map(item => <article key={item.number} className="benefit"><span className="number">{item.number}<span aria-hidden="true">↗</span></span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></section>;
}
export function LearningProcess() {
  return <section className="section process" id="process" aria-labelledby="process-title"><div className="container" data-reveal><p className="eyebrow">04 / ВАШ ПУТЬ В ASYL</p><h2 id="process-title">Большая цель.<br /><em>Понятные шаги.</em></h2><div className="steps">{steps.map((step, i) => <article key={step.title}><span className="step-number">0{i + 1}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}</div><p className="fine-print">Предлагаемая модель обучения. Детали занятий уточняются со школой.</p></div></section>;
}
export function Testimonials() {
  const { reviews } = useContent();
  if (reviews.length) return <section className="section container testimonials" id="stories"><SectionHeading eyebrow="05 / ГОЛОСА УЧЕНИКОВ" centered>Истории <em>учеников.</em></SectionHeading><div className="review-grid">{reviews.map(review => <article key={review.id}><p aria-label={`Оценка ${review.rating} из 5`}>{"★".repeat(review.rating)}</p><blockquote>{review.text}</blockquote><strong>{review.authorName}</strong></article>)}</div></section>;
  return <section className="section container testimonials" id="stories" data-reveal><SectionHeading eyebrow="05 / ИСТОРИИ, КОТОРЫЕ ВПЕРЕДИ" centered>Здесь будут<br /><em>голоса учеников.</em></SectionHeading><div className="testimonial-placeholder"><span className="quote-mark" aria-hidden="true">“</span><p>Первый разговор без переводчика.<br />Первое «я всё понял».<br />Первая история на новом языке.</p><div className="placeholder-label"><span aria-hidden="true">✧</span> МЕСТО ДЛЯ НАСТОЯЩИХ ОТЗЫВОВ</div><small>Опубликуем отзывы с разрешения учеников. Этот блок — заглушка.</small></div></section>;
}
export function Footer() {
  const { openSettings } = useConsent();
  return <footer className="footer"><div className="container footer-top"><Logo /><p>Слова становятся мостами.<br />Начните строить свой.</p><nav aria-label="Навигация в подвале"><a href="#programs">Направления</a><a href="#faq">Вопросы</a><a href="#contact">Связаться</a></nav><div className="legal-links"><a href={routeHref("/privacy")}>Конфиденциальность</a><a href={routeHref("/cookies")}>Политика cookies</a><a href={routeHref("/terms")}>Условия</a><button type="button" onClick={openSettings}>Настройки cookies</button></div><a className="back-top" href="#home">Наверх <span aria-hidden="true">↑</span></a></div><div className="container footer-bottom"><small>© {new Date().getFullYear()} ASYL Language School</small><small>Демонстрационный сайт · условия и контакты уточняются</small></div></footer>;
}
