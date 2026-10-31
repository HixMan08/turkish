import { z } from 'zod';
export function plainText(value: string): string { return value.normalize('NFC').replace(/<[^>]*>/g, '').split('').filter(character => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127 || ['\t','\n','\r'].includes(character)).join('').trim(); }
const text = (min: number, max: number) => z.string().max(max).transform(plainText).pipe(z.string().min(min).max(max));
export const languageSchema = z.enum(['turkish', 'kazakh', 'russian']);
export const statusSchema = z.enum(['new', 'contacted', 'enrolled', 'rejected']);
export const applicationSchema = z.object({
  name: text(2, 60).refine(value => /^[\p{L}\p{M}][\p{L}\p{M} '-]+$/u.test(value), 'Введите имя буквами'),
  phone: z.string().max(30).regex(/^[+\d\s()-]+$/).transform(value => value.replace(/\D/g, '')).refine(value => value.length >= 10 && value.length <= 15, 'Телефон должен содержать 10–15 цифр'),
  email: z.union([z.string().trim().email().max(254), z.literal('')]).optional().transform(value => value || null),
  language: languageSchema, level: z.enum(['unknown', 'A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']).default('unknown'),
  preferredFormat: z.enum(['online', 'offline']).default('online'), message: text(0, 2000).default(''), source: text(1, 100).default('website'),
  consent: z.literal(true), consentVersion: z.literal('2026-10-31'), website: z.string().max(500).default(''),
}).strict();
export const loginSchema = z.object({ email: z.string().trim().email().max(254).transform(value => value.toLowerCase()), password: z.string().min(1).max(128).refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Пароль слишком длинный') }).strict();
export const programSchema = z.object({ language: languageSchema, title: text(1, 100), nativeName: text(1, 80), greeting: text(1, 100), description: text(1, 1000), levels: z.array(z.enum(['A0','A1','A2','B1','B2','C1','C2'])).min(1).max(7), topics: z.array(text(1, 150)).max(8), price: z.number().int().min(0).max(100000000).nullable().default(null), isActive: z.boolean().default(true), sortOrder: z.number().int().min(0).max(10000).default(0) }).strict();
export const phraseSchema = z.object({ turkish: text(1, 250), transcription: text(1, 250), translation: text(1, 500), category: text(1, 200) }).strict();
export const faqSchema = z.object({ question: text(1, 300), answer: text(1, 3000), sortOrder: z.number().int().min(0).max(10000).default(0) }).strict();
export const reviewSchema = z.object({ authorName: text(1, 100), text: text(1, 2000), rating: z.number().int().min(1).max(5), isPublished: z.boolean().default(false) }).strict();
export const listSchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20), status: statusSchema.optional(), language: languageSchema.optional(), search: text(0, 100).optional(), from: z.string().datetime().optional(), to: z.string().datetime().optional() }).strict();
export const idSchema = z.string().cuid();
