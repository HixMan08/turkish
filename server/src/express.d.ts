import type { AdminRole } from '@prisma/client';
import 'express-serve-static-core';
declare module 'express-serve-static-core' {
  interface Locals {
    session: { tokenHash: string; userId: string; csrfToken: string; createdAt: Date; expiresAt: Date; user: { id: string; email: string; role: AdminRole } };
  }
}
