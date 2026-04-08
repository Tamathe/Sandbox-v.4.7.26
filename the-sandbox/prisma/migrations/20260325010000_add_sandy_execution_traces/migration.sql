-- CreateEnum
CREATE TYPE "SandyExecutionStatus" AS ENUM (
  'RUNNING',
  'COMPLETED',
  'FAILED'
);

-- CreateTable
CREATE TABLE "SandyExecutionTrace" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userRole" "UserRole" NOT NULL,
  "currentPage" TEXT,
  "requestMessages" JSONB NOT NULL,
  "requestMessageCount" INTEGER NOT NULL DEFAULT 0,
  "lastUserMessage" TEXT,
  "integrationSnapshot" JSONB,
  "modelName" TEXT,
  "status" "SandyExecutionStatus" NOT NULL DEFAULT 'RUNNING',
  "toolCallCount" INTEGER NOT NULL DEFAULT 0,
  "approvalCount" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "finalResponse" TEXT,
  "failureMessage" TEXT,
  "lastEventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "durationMs" INTEGER,

  CONSTRAINT "SandyExecutionTrace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SandyExecutionEvent" (
  "id" TEXT NOT NULL,
  "traceId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "eventType" TEXT NOT NULL,
  "toolName" TEXT,
  "toolCallId" TEXT,
  "approvalId" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SandyExecutionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SandyExecutionTrace_userId_startedAt_idx" ON "SandyExecutionTrace"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "SandyExecutionTrace_sessionId_startedAt_idx" ON "SandyExecutionTrace"("sessionId", "startedAt");

-- CreateIndex
CREATE INDEX "SandyExecutionTrace_status_startedAt_idx" ON "SandyExecutionTrace"("status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SandyExecutionEvent_traceId_sequence_key" ON "SandyExecutionEvent"("traceId", "sequence");

-- CreateIndex
CREATE INDEX "SandyExecutionEvent_traceId_createdAt_idx" ON "SandyExecutionEvent"("traceId", "createdAt");

-- CreateIndex
CREATE INDEX "SandyExecutionEvent_eventType_createdAt_idx" ON "SandyExecutionEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "SandyExecutionEvent_toolName_createdAt_idx" ON "SandyExecutionEvent"("toolName", "createdAt");

-- AddForeignKey
ALTER TABLE "SandyExecutionTrace"
ADD CONSTRAINT "SandyExecutionTrace_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SandyExecutionEvent"
ADD CONSTRAINT "SandyExecutionEvent_traceId_fkey"
FOREIGN KEY ("traceId") REFERENCES "SandyExecutionTrace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
