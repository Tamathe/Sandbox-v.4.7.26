-- CreateTable
CREATE TABLE "PlaygroundApp" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Untitled App',
    "description" TEXT,
    "htmlContent" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaygroundApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppStoreEntry" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "uniqueKey" TEXT,
    "type" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "userId" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppStoreEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppStoreDelegate" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppStoreDelegate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlaygroundApp_creatorId_createdAt_idx" ON "PlaygroundApp"("creatorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppStoreEntry_uniqueKey_key" ON "AppStoreEntry"("uniqueKey");

-- CreateIndex
CREATE INDEX "AppStoreEntry_appId_type_bucket_idx" ON "AppStoreEntry"("appId", "type", "bucket");

-- CreateIndex
CREATE INDEX "AppStoreEntry_appId_type_bucket_userId_idx" ON "AppStoreEntry"("appId", "type", "bucket", "userId");

-- CreateIndex
CREATE INDEX "AppStoreDelegate_userId_idx" ON "AppStoreDelegate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AppStoreDelegate_appId_userId_key" ON "AppStoreDelegate"("appId", "userId");

-- AddForeignKey
ALTER TABLE "PlaygroundApp" ADD CONSTRAINT "PlaygroundApp_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppStoreEntry" ADD CONSTRAINT "AppStoreEntry_appId_fkey" FOREIGN KEY ("appId") REFERENCES "PlaygroundApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppStoreDelegate" ADD CONSTRAINT "AppStoreDelegate_appId_fkey" FOREIGN KEY ("appId") REFERENCES "PlaygroundApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppStoreDelegate" ADD CONSTRAINT "AppStoreDelegate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
