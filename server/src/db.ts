import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
export function createDatabase(connectionString: string, maxConnections = 10): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, max: maxConnections, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000 }) });
}
export type Database = PrismaClient;
