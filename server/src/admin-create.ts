import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { stdin, stdout } from 'node:process';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { createDatabase } from './db.js';
import { readConfig } from './env.js';
const config = readConfig(); const db = createDatabase(config.DATABASE_URL);
let muted = false;
const output = new Writable({ write(chunk: Buffer, _encoding, done) { if (!muted) stdout.write(chunk); done(); } });
const prompt = createInterface({ input: stdin, output, terminal: stdin.isTTY });
try {
  const email = z.string().trim().email().max(254).parse(process.env.ADMIN_EMAIL || await prompt.question('Admin email: ')).toLowerCase();
  let password = process.env.ADMIN_PASSWORD;
  if (!password) { if (!stdin.isTTY) throw new Error('Set ADMIN_PASSWORD for noninteractive use'); stdout.write('Admin password (hidden, 12–72 UTF-8 bytes): '); muted = true; password = await prompt.question(''); muted = false; stdout.write('\n'); }
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw new Error('Password must have at least 12 characters and at most 72 UTF-8 bytes');
  const existing = await db.adminUser.findUnique({ where: { email }, select: { id: true } }); if (existing) throw new Error('Admin already exists; this command never resets existing accounts');
  await db.adminUser.create({ data: { email, passwordHash: await hash(password, 12), role: 'admin' } }); stdout.write('Admin created. Password was not printed or logged.\n');
} finally { muted = false; prompt.close(); await db.$disconnect(); }
