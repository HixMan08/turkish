import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { Database } from './db.js';
import { faqSchema, idSchema, listSchema, phraseSchema, programSchema, reviewSchema, statusSchema } from './schemas.js';
import { HttpError, requireAdmin } from './security.js';
const resourceSchema = z.enum(['programs', 'phrases', 'faq', 'reviews']);
function escapeCsv(value: unknown): string { let text = value == null ? '' : String(value); if (/^[\s]*[=+@\-\t\r\n]/.test(text)) text = "'" + text; return '"' + text.replaceAll('"', '""') + '"'; }
export function adminRoutes(db: Database): Router {
  const router = Router();
  router.get('/applications', async (req, res) => {
    const query = listSchema.parse(req.query);
    const where: Prisma.ApplicationWhereInput = { status: query.status, language: query.language, createdAt: query.from || query.to ? { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined } : undefined, OR: query.search ? ['name', 'phone', 'email'].map(field => ({ [field]: { contains: query.search, mode: 'insensitive' } })) : undefined };
    const [items, total] = await db.$transaction([db.application.findMany({ where, select: { id: true, name: true, phone: true, email: true, language: true, level: true, preferredFormat: true, message: true, status: true, source: true, consentGivenAt: true, consentVersion: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }), db.application.count({ where })]);
    res.json({ data: items, pagination: { page: query.page, pageSize: query.pageSize, total, pages: Math.ceil(total / query.pageSize) } });
  });
  router.get('/applications/export', requireAdmin, async (req, res) => {
    const { status, language, search } = listSchema.parse(req.query);
    const items = await db.application.findMany({ where: { status, language, OR: search ? [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] : undefined }, orderBy: { createdAt: 'desc' }, take: 10000 });
    const columns = ['id', 'name', 'phone', 'email', 'language', 'level', 'preferredFormat', 'message', 'status', 'source', 'consentGivenAt', 'createdAt'] as const;
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="asyl-applications.csv"', 'X-Export-Limit': '10000' });
    res.send('\uFEFF' + [columns.join(','), ...items.map(item => columns.map(column => escapeCsv(item[column] instanceof Date ? item[column].toISOString() : item[column])).join(','))].join('\r\n'));
  });
  router.patch('/applications/:id/status', async (req, res) => {
    const { status } = z.object({ status: statusSchema }).strict().parse(req.body); const id = idSchema.parse(req.params.id);
    const item = await db.application.update({ where: { id }, data: { status }, select: { id: true, status: true } }); res.json({ data: item });
  });
  router.delete('/applications/:id', requireAdmin, async (req, res) => { await db.application.delete({ where: { id: idSchema.parse(req.params.id) } }); res.status(204).end(); });
  router.get('/:resource', async (req, res) => {
    const resource = resourceSchema.parse(req.params.resource);
    const data = resource === 'programs' ? await db.program.findMany({ orderBy: { sortOrder: 'asc' }, take: 500 }) : resource === 'phrases' ? await db.phrase.findMany({ orderBy: { id: 'asc' }, take: 500 }) : resource === 'faq' ? await db.faqItem.findMany({ orderBy: { sortOrder: 'asc' }, take: 500 }) : await db.review.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
    res.json({ data });
  });
  router.post('/:resource', requireAdmin, async (req, res) => {
    const resource = resourceSchema.parse(req.params.resource);
    const data = resource === 'programs' ? await db.program.create({ data: programSchema.parse(req.body) }) : resource === 'phrases' ? await db.phrase.create({ data: phraseSchema.parse(req.body) }) : resource === 'faq' ? await db.faqItem.create({ data: faqSchema.parse(req.body) }) : await db.review.create({ data: reviewSchema.parse(req.body) });
    res.status(201).json({ data });
  });
  router.put('/:resource/:id', requireAdmin, async (req, res) => {
    const resource = resourceSchema.parse(req.params.resource); const id = idSchema.parse(req.params.id);
    const data = resource === 'programs' ? await db.program.update({ where: { id }, data: programSchema.parse(req.body) }) : resource === 'phrases' ? await db.phrase.update({ where: { id }, data: phraseSchema.parse(req.body) }) : resource === 'faq' ? await db.faqItem.update({ where: { id }, data: faqSchema.parse(req.body) }) : await db.review.update({ where: { id }, data: reviewSchema.parse(req.body) });
    res.json({ data });
  });
  router.delete('/:resource/:id', requireAdmin, async (req, res) => {
    const resource = resourceSchema.parse(req.params.resource); const id = idSchema.parse(req.params.id);
    switch (resource) { case 'programs': await db.program.delete({ where: { id } }); break; case 'phrases': await db.phrase.delete({ where: { id } }); break; case 'faq': await db.faqItem.delete({ where: { id } }); break; case 'reviews': await db.review.delete({ where: { id } }); break; default: throw new HttpError(404, 'NOT_FOUND', 'Раздел не найден'); }
    res.status(204).end();
  });
  return router;
}
