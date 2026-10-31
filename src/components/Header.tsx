import { useEffect, useRef, useState } from 'react';
import { Logo } from './Shared';
export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && open) { setOpen(false); toggle.current?.focus(); } };
    const onResize = () => { if (window.innerWidth >= 900) setOpen(false); };
    window.addEventListener('keydown', onKey); window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); };
  }, [open]);
  return <header className={`header${scrolled ? ' is-scrolled' : ''}`}><div className="container header-inner"><Logo /><button ref={toggle} className={`menu-toggle${open ? ' active' : ''}`} type="button" aria-label={open ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={open} aria-controls="main-menu" onClick={() => setOpen(!open)}><span /><span /></button><nav id="main-menu" className={open ? 'navigation open' : 'navigation'} aria-label="Основная навигация"><a onClick={() => setOpen(false)} href="#about">О школе</a><a onClick={() => setOpen(false)} href="#programs">Направления</a><a onClick={() => setOpen(false)} href="#process">Как учимся</a><a onClick={() => setOpen(false)} href="#faq">Вопросы</a><a onClick={() => setOpen(false)} className="button button-small" href="#contact">Пробный урок <span aria-hidden="true">↗</span></a></nav></div></header>;
}
