import nodemailer from 'nodemailer';
import { pino } from 'pino';
import type { Database } from './db.js';
import type { Config } from './env.js';
export function startNotifications(db: Database, config: Config): () => void {
  const logger = pino({ level: config.LOG_LEVEL }); let running = false;
  const telegram = Boolean(config.TELEGRAM_BOT_TOKEN && config.TELEGRAM_CHAT_ID);
  const email = Boolean(config.SMTP_HOST && config.SMTP_FROM && config.NOTIFICATION_EMAIL);
  const transport = email ? nodemailer.createTransport({ host: config.SMTP_HOST, port: config.SMTP_PORT, secure: config.SMTP_SECURE, requireTLS: !config.SMTP_SECURE, connectionTimeout: 10000, socketTimeout: 15000, auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } : undefined }) : null;
  async function tick(): Promise<void> {
    if (running || (!telegram && !email)) return; running = true;
    try {
      const jobs = await db.notificationOutbox.findMany({ where: { deliveredAt: null, nextAttemptAt: { lte: new Date() }, attempts: { lt: 10 }, OR: [{ lockedUntil: null }, { lockedUntil: { lt: new Date() } }] }, include: { application: { select: { language: true } } }, orderBy: { createdAt: 'asc' }, take: 10 });
      for (const job of jobs) {
        const lease = await db.notificationOutbox.updateMany({ where: { id: job.id, deliveredAt: null, OR: [{ lockedUntil: null }, { lockedUntil: { lt: new Date() } }] }, data: { lockedUntil: new Date(Date.now() + 120000), attempts: { increment: 1 } } });
        if (!lease.count) continue;
        try {
          const text = `ASYL: новая заявка ${job.applicationId}. Язык: ${job.application.language}. Откройте админку школы для просмотра. Контактные данные не пересылаются.`;
          if (telegram && !job.telegramSent) {
            const response = await fetch(`https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: config.TELEGRAM_CHAT_ID, text }), signal: AbortSignal.timeout(15000) });
            const body: unknown = await response.json(); if (!response.ok || typeof body !== 'object' || body === null || !('ok' in body) || body.ok !== true) throw new Error('Telegram delivery failed');
            await db.notificationOutbox.update({ where: { id: job.id }, data: { telegramSent: true } });
          }
          if (transport && !job.emailSent) { await transport.sendMail({ from: config.SMTP_FROM, to: config.NOTIFICATION_EMAIL, subject: 'ASYL: новая заявка', text }); await db.notificationOutbox.update({ where: { id: job.id }, data: { emailSent: true } }); }
          await db.notificationOutbox.update({ where: { id: job.id }, data: { deliveredAt: new Date(), lockedUntil: null, lastError: null } });
        } catch { await db.notificationOutbox.update({ where: { id: job.id }, data: { lockedUntil: null, nextAttemptAt: new Date(Date.now() + Math.min(3600000, 30000 * 2 ** job.attempts)), lastError: 'Delivery failed; inspect provider configuration' } }); logger.warn({ jobId: job.id }, 'Notification will retry'); }
      }
    } catch { logger.error('Notification worker unavailable'); } finally { running = false; }
  }
  const timer = setInterval(() => { void tick(); }, 15000); timer.unref(); void tick();
  return () => { clearInterval(timer); transport?.close(); };
}
