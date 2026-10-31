import express from 'express';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { pino } from 'pino';
import { pinoHttp } from 'pino-http';
import { compare } from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { createHmac } from 'node:crypto';
import { z, ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Config } from './env.js';
import type { Database } from './db.js';
import { applicationSchema, loginSchema } from './schemas.js';
import { authenticate, csrf, databaseRateLimit, digest, getToken, HttpError, newSession, originGuard, clearSessionCookie } from './security.js';
import { adminRoutes } from './admin-routes.js';
export function createApp(db: Database, config: Config) {
  const app = express(); const logger = pino({ level: config.LOG_LEVEL, redact: ['password', 'token', 'cookie', 'authorization'] });
  app.disable('x-powered-by'); app.set('trust proxy', config.TRUST_PROXY_HOPS); app.set('etag', 'strong');
  app.use(pinoHttp({ logger, serializers: { req: req => ({ id: req.id, method: req.method, url: String(req.url).split('?')[0] }), res: res => ({ statusCode: res.statusCode }) } }));
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'", ...(config.ANALYTICS_ORIGIN ? [config.ANALYTICS_ORIGIN] : [])], styleSrc: ["'self'"], imgSrc: ["'self'", 'data:'], fontSrc: ["'self'"], connectSrc: ["'self'", ...(config.ANALYTICS_ORIGIN ? [config.ANALYTICS_ORIGIN] : [])], frameAncestors: ["'none'"] } }, crossOriginEmbedderPolicy: false }));
  app.use(compression());
  app.use('/api', cors({ origin: (origin, cb) => cb(origin && !config.ALLOWED_ORIGINS.includes(origin) ? new HttpError(403, 'ORIGIN', 'Источник запроса не разрешён') : null, !origin || config.ALLOWED_ORIGINS.includes(origin)), credentials: true, allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Idempotency-Key'], methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'], maxAge: 600 }));
  app.use('/api', rateLimit({ windowMs: 60000, limit: 180, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: { code: 'RATE_LIMIT', message: 'Слишком много запросов. Повторите позже.' } } }));
  app.use('/api', express.json({ limit: '16kb', type: 'application/json' }), cookieParser(), originGuard(config));
  app.use('/api', (req, res, next) => { if (!['GET','HEAD','OPTIONS'].includes(req.method) && !req.is('application/json') && req.method !== 'DELETE' && (Number(req.get('content-length') ?? '0') > 0 || Boolean(req.get('transfer-encoding')))) { next(new HttpError(415, 'CONTENT_TYPE', 'Требуется application/json')); return; } res.set('Cache-Control', 'no-store'); next(); });
  app.get('/api/health', async (_req, res) => { await db.$queryRaw`SELECT 1`; res.json({ data: { status: 'ok' } }); });
  const cache: RequestHandler = (_req, res, next) => { res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=60'); next(); };
  app.get('/api/programs', cache, async (req, res) => { z.object({}).strict().parse(req.query); res.json({ data: await db.program.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, take: 500 }) }); });
  app.get('/api/phrases', async (req, res) => {
    const { random } = z.object({ random: z.enum(['true', 'false']).optional() }).strict().parse(req.query);
    if (random === 'true') { const count = await db.phrase.count(); res.json({ data: count ? await db.phrase.findMany({ skip: Math.floor(Math.random() * count), take: 1, orderBy: { id: 'asc' } }) : [] }); } else { res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=60'); res.json({ data: await db.phrase.findMany({ take: 500, orderBy: { id: 'asc' } }) }); }
  });
  app.get('/api/faq', cache, async (req, res) => { z.object({}).strict().parse(req.query); res.json({ data: await db.faqItem.findMany({ orderBy: { sortOrder: 'asc' }, take: 500 }) }); });
  app.get('/api/reviews', cache, async (req, res) => { z.object({}).strict().parse(req.query); res.json({ data: await db.review.findMany({ where: { isPublished: true }, orderBy: { createdAt: 'desc' }, take: 100 }) }); });
  app.post('/api/applications', (_req, _res, next) => { if (!config.APPLICATIONS_ENABLED) next(new HttpError(503, 'APPLICATIONS_DISABLED', 'Приём заявок пока закрыт')); else next(); }, databaseRateLimit(db, config, 'application', 5, 3600000), async (req, res) => {
    const data = applicationSchema.parse(req.body);
    if (data.website) { res.status(202).json({ data: { accepted: true } }); return; }
    const requestId = z.string().uuid().parse(req.get('x-idempotency-key'));
    const { consent: _consent, website: _website, ...fields } = data;
    const requestHash = createHmac('sha256', config.SESSION_SECRET).update(JSON.stringify(fields)).digest('hex');
    async function duplicate() { const existing = await db.application.findUnique({ where: { requestId }, select: { id: true, requestHash: true } }); if (!existing || existing.requestHash !== requestHash) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT', 'Для изменённой заявки нужен новый ключ отправки'); return existing.id; }
    const existing = await db.application.findUnique({ where: { requestId }, select: { id: true } });
    if (existing) { res.json({ data: { id: await duplicate(), accepted: true } }); return; }
    try {
      const item = await db.$transaction(async tx => { const application = await tx.application.create({ data: { ...fields, requestId, requestHash, consentGivenAt: new Date() }, select: { id: true } }); await tx.notificationOutbox.create({ data: { applicationId: application.id } }); return application; });
      res.status(201).json({ data: { id: item.id, accepted: true } });
    } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') { res.json({ data: { id: await duplicate(), accepted: true } }); } else throw error; }
  });
  app.post('/api/auth/login', databaseRateLimit(db, config, 'login-ip', 20, 900000), databaseRateLimit(db, config, 'login-account', 5, 900000, req => (req.ip ?? '') + ':' + String(typeof req.body?.email === 'string' ? req.body.email : '').trim().toLowerCase().slice(0, 254)), async (req, res) => {
    const { email, password } = loginSchema.parse(req.body); const user = await db.adminUser.findUnique({ where: { email } });
    const valid = await compare(password, user?.passwordHash ?? '$2b$12$XQiENjBkKH29bJvJjdTzKOCv4ui6ORVofP5mwhhvwQLpYQkH6KMxK');
    if (!user || !valid) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Неверный email или пароль');
    const session = await newSession(db, user.id, res, config, getToken(req)); res.json({ data: { user: session.user, csrfToken: session.csrfToken } });
  });
  const auth = authenticate(db, config);
  app.get('/api/auth/session', auth, async (req, res) => { let session = res.locals.session; if (Date.now() - session.createdAt.getTime() > config.SESSION_ROTATE_MINUTES * 60000) session = await newSession(db, session.userId, res, config, getToken(req)); res.json({ data: { user: session.user, csrfToken: session.csrfToken } }); });
  app.post('/api/auth/logout', auth, csrf, async (req, res) => { const token = getToken(req); if (token) await db.adminSession.deleteMany({ where: { tokenHash: digest(token) } }); clearSessionCookie(res, config); res.status(204).end(); });
  app.use('/api/admin', auth, (req, res, next) => { if (['GET','HEAD'].includes(req.method)) next(); else csrf(req,res,next); }, adminRoutes(db));
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'NOT_FOUND', 'API-маршрут не найден')));
  const clientDir = fileURLToPath(new URL('../../client/dist/', import.meta.url));
  app.get('/robots.txt', (_req, res) => res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${config.SITE_URL}/sitemap.xml\n`));
  app.get('/sitemap.xml', (_req, res) => res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/privacy', '/cookies', '/terms'].map(route => `<url><loc>${new URL(route, config.SITE_URL).href.replaceAll('&', '&amp;')}</loc></url>`).join('')}</urlset>`));
  app.use(express.static(clientDir, { index: false, maxAge: '1h', setHeaders: (res, file) => { if (file.includes(path.sep + 'assets' + path.sep)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); } }));
  app.get(['/', '/admin', '/privacy', '/cookies', '/terms', '/error'], (req, res) => res.sendFile(path.join(clientDir, req.path === '/' ? 'index.html' : req.path.toLowerCase().replace(/^\/|\/$/g, '') + '/index.html')));
  app.use((_req, res) => res.status(404).sendFile(path.join(clientDir, '404.html')));
  const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
    if (res.headersSent) return;
    if (error instanceof ZodError) { res.status(422).json({ error: { code: 'VALIDATION', message: 'Проверьте введённые данные', fields: error.flatten().fieldErrors, requestId: String(req.id ?? '') } }); return; }
    if (error instanceof HttpError) { res.status(error.status).json({ error: { code: error.code, message: error.message } }); return; }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Запись не найдена' } }); return; }
    const status = typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined;
    if (status === 413) { res.status(413).json({ error: { code: 'BODY_TOO_LARGE', message: 'Слишком большой запрос' } }); return; }
    if (error instanceof SyntaxError) { res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Некорректный JSON' } }); return; }
    req.log.error({ name: error instanceof Error ? error.name : 'UnknownError', requestId: req.id }, 'Request failed');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Сервис временно недоступен. Повторите позже', requestId: String(req.id ?? '') } });
  };
  app.use(errorHandler); return app;
}
