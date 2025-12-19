-- CreateEnum
CREATE TYPE "QuotaTier" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateTable
CREATE TABLE "organization_quota" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tier" "QuotaTier" NOT NULL DEFAULT 'FREE',
    "monthlyLimit" INTEGER DEFAULT 100,
    "warningThreshold" INTEGER NOT NULL DEFAULT 80,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_quota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_record" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "quotaId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "endpointBreakdown" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_usage_record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_quota_organizationId_key" ON "organization_quota"("organizationId");

-- CreateIndex
CREATE INDEX "ai_usage_record_organizationId_idx" ON "ai_usage_record"("organizationId");

-- CreateIndex
CREATE INDEX "ai_usage_record_periodKey_idx" ON "ai_usage_record"("periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_record_organizationId_periodKey_key" ON "ai_usage_record"("organizationId", "periodKey");

-- AddForeignKey
ALTER TABLE "organization_quota" ADD CONSTRAINT "organization_quota_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_record" ADD CONSTRAINT "ai_usage_record_quotaId_fkey" FOREIGN KEY ("quotaId") REFERENCES "organization_quota"("id") ON DELETE CASCADE ON UPDATE CASCADE;
