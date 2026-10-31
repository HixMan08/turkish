import { useState } from 'react';
import { faqs } from '../data';
import { SectionHeading } from './Shared';
export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return <section className="section container faq-section" id="faq" data-reveal><SectionHeading eyebrow="06 / ПЕРЕД ПЕРВЫМ ШАГОМ">Всё начинается<br /><em>с вопроса.</em></SectionHeading><div className="faq-list">{faqs.map((faq, index) => <article className={`faq-item${open === index ? ' open' : ''}`} key={faq.question}><h3><button id={`faq-button-${index}`} type="button" aria-expanded={open === index} aria-controls={`faq-panel-${index}`} onClick={() => setOpen(open === index ? null : index)}>{faq.question}<span aria-hidden="true">+</span></button></h3><div className="faq-panel" id={`faq-panel-${index}`} role="region" aria-labelledby={`faq-button-${index}`} aria-hidden={open !== index}><div><p>{faq.answer}</p></div></div></article>)}</div></section>;
}
