import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { routeHref } from './consent';
export function ErrorPage({ notFound = false }: { notFound?: boolean }) { return <main className="container legal-page"><p className="eyebrow">ASYL LANGUAGE SCHOOL</p><h1>{notFound ? 'Страница не найдена' : 'Что-то пошло не так'}</h1><p>{notFound ? 'Проверьте адрес или вернитесь на главную.' : 'Попробуйте обновить страницу. Если проблема сохраняется, вернитесь позже.'}</p><a className="button" href={routeHref('/')}>На главную</a></main>; }
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo): void { /* No personal data or component state is logged in the browser. */ }
  render(): ReactNode { return this.state.failed ? <ErrorPage /> : this.props.children; }
}
