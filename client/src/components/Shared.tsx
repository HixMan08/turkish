import type { ReactNode } from 'react';
interface HeadingProps { eyebrow: string; children: ReactNode; description?: string; centered?: boolean; }
export function SectionHeading({ eyebrow, children, description, centered = false }: HeadingProps) {
  return <div className={`section-heading${centered ? ' centered' : ''}`}><p className="eyebrow">{eyebrow}</p><h2>{children}</h2>{description && <p className="section-description">{description}</p>}</div>;
}
export function Arrow({ diagonal = false }: { diagonal?: boolean }) { return <span aria-hidden="true" className="arrow">{diagonal ? '↗' : '→'}</span>; }
export function Logo() { return <a className="brand" href="#home" aria-label="ASYL Language School — на главную"><span>ASYL<span className="brand-star" aria-hidden="true">✳</span></span><small>LANGUAGE SCHOOL</small></a>; }
