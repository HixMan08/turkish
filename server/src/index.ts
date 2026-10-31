import { pino } from 'pino';
import { createApp } from './app.js';
import { readConfig } from './env.js';
import { createDatabase } from './db.js';
import { startNotifications } from './notifications.js';
const config = readConfig(); const db = createDatabase(config.DATABASE_URL); const logger = pino({ level: config.LOG_LEVEL });
await db.$connect();
const server = createApp(db, config).listen(config.PORT, config.HOST, () => logger.info({ port: config.PORT }, 'ASYL API ready'));
server.requestTimeout = 30000; server.headersTimeout = 15000;
const stopNotifications = startNotifications(db, config);
const cleanup = setInterval(() => { void Promise.all([db.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } }), db.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } })]).catch(() => logger.error('Session cleanup failed')); }, 3600000); cleanup.unref();
function shutdown(): void { stopNotifications(); clearInterval(cleanup); server.close(() => { void db.$disconnect().finally(() => process.exit(0)); }); setTimeout(() => process.exit(1), 10000).unref(); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
