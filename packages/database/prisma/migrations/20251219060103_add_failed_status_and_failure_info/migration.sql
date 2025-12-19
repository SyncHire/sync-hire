/*
  Warnings:

  - You are about to drop the column `questionsHash` on the `candidate_application` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "candidate_application" DROP COLUMN "questionsHash",
ADD COLUMN     "failureInfo" JSONB;
