import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, RequestHandler, Response } from 'express';
import type { Database } from './db.js';
import type { Config } from './env.js';
export class HttpError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
export const digest = (value: string): string => createHash('sha256').update(value).digest('hex');
export const sessionCookie = 'asyl_session';
export function cookieOptions(config: Config) { return { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/api', maxAge: config.SESSION_TTL_HOURS * 3600000 }; }
export function setSessionCookie(res: Response, token: string, config: Config): void { res.cookie(sessionCookie, token, cookieOptions(config)); }
export function clearSessionCookie(res: Response, config: Config): void { const { maxAge: _maxAge, ...options } = cookieOptions(config); res.clearCookie(sessionCookie, options); }
export function getToken(req: Request): string | undefined { const value: unknown = req.cookies?.[sessionCookie]; return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) ? value : undefined; }
export async function newSession(db: Database, userId: string, res: Response, config: Config, previous?: string) {
  const token = randomBytes(32).toString('hex'); const csrfToken = randomBytes(32).toString('hex');
  const session = await db.$transaction(async tx => {
    if (previous) await tx.adminSession.deleteMany({ where: { tokenHash: digest(previous) } });
    return tx.adminSession.create({ data: { tokenHash: digest(token), userId, csrfToken, expiresAt: new Date(Date.now() + config.SESSION_TTL_HOURS * 3600000) }, include: { user: { select: { id: true, email: true, role: true } } } });
  });
  setSessionCookie(res, token, config); return session;
}
export type Session = NonNullable<Awaited<ReturnType<Database['adminSession']['findUnique']>>>;
export function authenticate(db: Database, config: Config): RequestHandler {
  return async (req, res, next) => {
    try {
      const token = getToken(req); if (!token) throw new HttpError(401, 'UNAUTHORIZED', 'Войдите в админку');
      const session = await db.adminSession.findUnique({ where: { tokenHash: digest(token) }, include: { user: { select: { id: true, email: true, role: true } } } });
      if (!session || session.expiresAt <= new Date()) { clearSessionCookie(res, config); throw new HttpError(401, 'SESSION_EXPIRED', 'Сессия истекла. Войдите снова'); }
      res.locals.session = session; next();
    } catch (error) { next(error); }
  };
}
export const csrf: RequestHandler = (req, res, next) => {
  const expected: string = res.locals.session.csrfToken; const received = req.get('x-csrf-token') ?? '';
  if (! /^[a-f0-9]{64}$/.test(received) || received.length !== expected.length || !timingSafeEqual(Buffer.from(received), Buffer.from(expected))) { next(new HttpError(403, 'CSRF', 'Обновите страницу и повторите действие')); return; } next();
};
export const requireAdmin: RequestHandler = (_req, res, next) => { if (res.locals.session.user.role !== 'admin') { next(new HttpError(403, 'FORBIDDEN', 'Недостаточно прав')); return; } next(); };
export function originGuard(config: Config): RequestHandler {
  return (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) { next(); return; }
    const origin = req.get('origin');
    if (!origin || !config.ALLOWED_ORIGINS.includes(origin)) { next(new HttpError(403, 'ORIGIN', 'Источник запроса не разрешён')); return; } next();
  };
}
export function databaseRateLimit(db: Database, config: Config, scope: string, max: number, windowMs: number, identity: (req: Request) => string = req => req.ip ?? 'unknown'): RequestHandler {
  return async (req, res, next) => {
    try {
      const slot = Math.floor(Date.now() / windowMs); const key = createHmac('sha256', config.SESSION_SECRET).update(scope + ':' + identity(req)).digest('hex');
      const bucket = await db.rateLimitBucket.upsert({ where: { id: key + ':' + slot }, create: { id: key + ':' + slot, count: 1, expiresAt: new Date((slot + 1) * windowMs) }, update: { count: { increment: 1 } } });
      if (bucket.count > max) { res.set('Retry-After', String(Math.max(1, Math.ceil((bucket.expiresAt.getTime() - Date.now()) / 1000)))); throw new HttpError(429, 'RATE_LIMIT', 'Слишком много попыток. Повторите позже'); }
      next();
    } catch (error) { next(error); }
  };
}
