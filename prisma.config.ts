import 'dotenv/config';
import { defineConfig } from 'prisma/config';
export default defineConfig({ schema: 'server/prisma/schema.prisma', migrations: { path: 'server/prisma/migrations', seed: 'tsx server/prisma/seed.ts' }, datasource: { url: process.env.DATABASE_URL || 'postgresql://build:build@127.0.0.1:5432/asyl' } });
