-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('turkish', 'kazakh', 'russian');

-- CreateEnum
CREATE TYPE "PreferredFormat" AS ENUM ('online', 'offline');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('new', 'contacted', 'enrolled', 'rejected');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('admin', 'editor');

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "language" "Language" NOT NULL,
    "level" TEXT NOT NULL,
    "preferredFormat" "PreferredFormat" NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'new',
    "source" TEXT NOT NULL,
    "consentGivenAt" TIMESTAMP(3) NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "title" TEXT NOT NULL,
    "nativeName" TEXT NOT NULL,
    "greeting" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "levels" TEXT[],
    "topics" TEXT[],
    "price" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Phrase" (
    "id" TEXT NOT NULL,
    "turkish" TEXT NOT NULL,
    "transcription" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "Phrase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqItem" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "csrfToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationOutbox" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "telegramSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Application_requestId_key" ON "Application"("requestId");

-- CreateIndex
CREATE INDEX "Application_status_createdAt_idx" ON "Application"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Application_language_createdAt_idx" ON "Application"("language", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

-- CreateIndex
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- CreateIndex
CREATE INDEX "NotificationOutbox_deliveredAt_nextAttemptAt_idx" ON "NotificationOutbox"("deliveredAt", "nextAttemptAt");

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationOutbox" ADD CONSTRAINT "NotificationOutbox_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

