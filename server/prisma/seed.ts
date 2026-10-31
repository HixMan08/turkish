import { createDatabase } from '../src/db.js';
import { readConfig } from '../src/env.js';
import { programs, phrases, faqs } from './initial-content.js';
export async function seedContent(db: ReturnType<typeof createDatabase>): Promise<void> {
  for (const [index, program] of programs.entries()) {
    const id = 'cseedprogram' + program.id + '000000001';
    await db.program.upsert({ where: { id }, update: {}, create: { id, language: program.id, title: program.name, nativeName: program.nativeName, greeting: program.greeting, description: program.description, levels: program.id === 'russian' ? ['A1', 'A2', 'B1', 'B2', 'C1'] : ['A1', 'A2', 'B1', 'B2'], topics: [...program.topics], sortOrder: index, price: null } });
  }
  for (const [index, phrase] of phrases.entries()) {
    const id = 'cseedphrase000000000000' + index;
    await db.phrase.upsert({ where: { id }, update: {}, create: { id, turkish: phrase.text, transcription: phrase.pronunciation, translation: phrase.translation, category: phrase.context } });
  }
  for (const [index, faq] of faqs.entries()) {
    const id = 'cseedfaq00000000000000' + index;
    await db.faqItem.upsert({ where: { id }, update: {}, create: { id, question: faq.question, answer: index === 4 ? 'После подключения сервера и подтверждения условий обработки данных заявка сохраняется в базе школы. Согласие на обработку персональных данных обязательно. Если отправка не удалась, можно повторить её без дублирования заявки.' : faq.answer, sortOrder: index } });
  }
  // Reviews are intentionally empty until actual students approve publication.
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/prisma/seed.ts')) {
  const db = createDatabase(readConfig().DATABASE_URL);
  try { await seedContent(db); process.stdout.write('Initial content seeded; existing edits and accounts were preserved.\n'); } finally { await db.$disconnect(); }
}
