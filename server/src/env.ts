import dotenv from 'dotenv';
import { z } from 'zod';
import { fileURLToPath } from 'node:url';
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
const optional = z.string().default('');
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001), HOST: z.string().default('127.0.0.1'),
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  SESSION_SECRET: z.string().min(32), APPLICATIONS_ENABLED: z.enum(['true','false']).default('false').transform(value => value === 'true'),
  ALLOWED_ORIGINS: z.string().min(1).transform(value => value.split(',').map(origin => z.string().url().parse(origin.trim()))),
  SITE_URL: z.string().url().default('http://localhost:3001'),
  SESSION_TTL_HOURS: z.coerce.number().min(1).max(24).default(8), SESSION_ROTATE_MINUTES: z.coerce.number().min(5).max(120).default(30),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(3).default(0), LOG_LEVEL: z.enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug']).default('info'),
  ANALYTICS_ORIGIN: z.string().default('').refine(value => value === '' || URL.canParse(value) && new URL(value).origin === value && value.startsWith('https://')),
  TELEGRAM_BOT_TOKEN: optional, TELEGRAM_CHAT_ID: optional,
  SMTP_HOST: optional, SMTP_PORT: z.coerce.number().int().default(587), SMTP_SECURE: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),
  SMTP_USER: optional, SMTP_PASSWORD: optional, SMTP_FROM: optional, NOTIFICATION_EMAIL: optional,
});
export type Config = z.infer<typeof schema>;
export function readConfig(input: NodeJS.ProcessEnv = process.env): Config {
  const result = schema.parse(input);
  result.ALLOWED_ORIGINS.forEach(origin => { if (new URL(origin).origin !== origin) throw new Error('ALLOWED_ORIGINS must contain exact origins without paths'); });
  if (result.NODE_ENV === 'production' && (!result.SITE_URL.startsWith('https://') || result.ALLOWED_ORIGINS.some(origin => !origin.startsWith('https://')) || result.SESSION_SECRET.includes('replace_'))) throw new Error('Production requires HTTPS origins and a private random session secret');
  return result;
}
