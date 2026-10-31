import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { programs } from '../data';
import type { LanguageId } from '../data';
import { Arrow } from './Shared';
import { readDraft } from '../storage';
interface ContactProps { selected: LanguageId; onSelect: (id: LanguageId) => void; }
type FormStatus = 'idle' | 'saving' | 'success' | 'error';
interface FormErrors { name?: string; phone?: string; consent?: string; }
export function Contact({ selected, onSelect }: ContactProps) {
  const [draft] = useState(readDraft);
  const [name, setName] = useState(draft?.name ?? '');
  const [phone, setPhone] = useState(draft?.phone ?? '');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<FormStatus>('idle');
  const [message, setMessage] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (status === 'saving') return;
    const nextErrors: FormErrors = {};
    if (!/^[\p{L}\p{M}][\p{L}\p{M} '-]{1,59}$/u.test(name.trim())) nextErrors.name = 'Введите имя: от 2 до 60 букв.';
    const digits = phone.replace(/\D/g, '');
    if (!/^[+\d\s()-]+$/.test(phone) || digits.length < 10 || digits.length > 15) nextErrors.phone = 'Введите телефон: от 10 до 15 цифр, например +7 700 123 45 67.';
    if (!consent) nextErrors.consent = 'Подтвердите сохранение черновика на этом устройстве.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setStatus('error'); setMessage('Проверьте отмеченные поля.');
      if (nextErrors.name) nameRef.current?.focus(); else if (nextErrors.phone) phoneRef.current?.focus(); else consentRef.current?.focus();
      return;
    }
    setStatus('saving'); setMessage('Сохраняем черновик на устройстве…');
    try {
      await new Promise<void>(resolve => window.setTimeout(resolve, 450));
      localStorage.setItem('asyl-application-draft', JSON.stringify({ name: name.trim(), phone: phone.trim(), language: selected }));
      setStatus('success'); setMessage('Черновик сохранён в этом браузере. Он не отправлен школе: контакты и отправка пока не подключены.');
    } catch {
      setStatus('error'); setMessage('Не удалось сохранить: браузер запретил локальное хранилище или оно заполнено. Данные не отправлены. Попробуйте ещё раз.');
    }
  }
  function resetStatus(): void { if (status !== 'saving') { setStatus('idle'); setMessage(''); } }
  return <section className="contact-section" id="contact" aria-labelledby="contact-title"><div className="container contact-layout" data-reveal><div className="contact-copy"><p className="eyebrow">07 / ДАВАЙТЕ ЗНАКОМИТЬСЯ</p><h2 id="contact-title">Ваш новый язык<br />начинается<br /><em>с «привет».</em></h2><p>Расскажите, какой язык вам интересен.<br />Первый шаг может быть простым.</p><div className="contact-detail"><span aria-hidden="true">✳</span><div><strong>ASYL Language School</strong><p>Турецкий · Казахский · Русский</p><small>Контакты, адрес и расписание скоро появятся.</small></div></div><div className="demo-notice"><strong>Демонстрационная форма</strong><p>Сейчас можно сохранить черновик на своём устройстве. Заявка не отправляется школе. Для записи дождитесь подтверждённых контактов.</p></div></div><form className="contact-form" onSubmit={event => { void submit(event); }} noValidate aria-busy={status === 'saving'}><h3>Давайте начнём с вас</h3><p>Выберите направление и оставьте черновик.</p><fieldset disabled={status === 'saving'}><legend className="sr-only">Данные для знакомства</legend><div className="field"><label htmlFor="application-name">Как вас зовут <span aria-hidden="true">*</span></label><input ref={nameRef} id="application-name" name="name" autoComplete="given-name" placeholder="Ваше имя" required maxLength={60} value={name} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} onChange={event => { setName(event.target.value); setErrors(previous => ({ ...previous, name: undefined })); resetStatus(); }} />{errors.name && <span className="field-error" id="name-error">{errors.name}</span>}</div><div className="field"><label htmlFor="application-phone">Телефон <span aria-hidden="true">*</span></label><input ref={phoneRef} type="tel" inputMode="tel" id="application-phone" name="phone" autoComplete="tel" placeholder="+7 700 123 45 67" maxLength={30} required value={phone} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'phone-error' : 'phone-help'} onChange={event => { setPhone(event.target.value); setErrors(previous => ({ ...previous, phone: undefined })); resetStatus(); }} /><small id="phone-help">С кодом страны, например +7 для Казахстана.</small>{errors.phone && <span className="field-error" id="phone-error">{errors.phone}</span>}</div><div className="field"><label htmlFor="application-language">Хочу изучать</label><select id="application-language" name="language" value={selected} onChange={event => { const program = programs.find(item => item.id === event.target.value); if (program) onSelect(program.id); resetStatus(); }}>{programs.map(program => <option value={program.id} key={program.id}>{program.name}</option>)}</select></div><label className="consent"><input ref={consentRef} type="checkbox" checked={consent} required aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? 'consent-error' : undefined} onChange={event => { setConsent(event.target.checked); setErrors(previous => ({ ...previous, consent: undefined })); resetStatus(); }} /><span>Согласен сохранить имя и телефон только в этом браузере. Школа их не получит.</span></label>{errors.consent && <span className="field-error" id="consent-error">{errors.consent}</span>}<button className="button submit-button" disabled={status === 'saving'} type="submit">{status === 'saving' ? 'Сохраняем…' : 'Сохранить черновик заявки'}{status === 'saving' ? <span className="spinner" aria-hidden="true" /> : <Arrow diagonal />}</button></fieldset><div className={`form-message ${status}`} role="status" aria-live="polite">{message}</div>{status === 'success' && <button type="button" className="text-link delete-draft" onClick={() => { try { localStorage.removeItem('asyl-application-draft'); setStatus('idle'); setMessage('Черновик удалён с этого устройства.'); } catch { setStatus('error'); setMessage('Не удалось удалить черновик. Очистите данные сайта в настройках браузера.'); } }}>Удалить сохранённый черновик</button>}</form></div></section>;
}

