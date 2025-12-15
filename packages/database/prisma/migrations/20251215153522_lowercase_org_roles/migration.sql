/*
  Warnings:

  - The values [OWNER,ADMIN,RECRUITER,HIRING_MANAGER,VIEWER] on the enum `OrgMemberRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrgMemberRole_new" AS ENUM ('owner', 'admin', 'member');
ALTER TABLE "public"."member" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "member" ALTER COLUMN "role" TYPE "OrgMemberRole_new" USING ("role"::text::"OrgMemberRole_new");
ALTER TYPE "OrgMemberRole" RENAME TO "OrgMemberRole_old";
ALTER TYPE "OrgMemberRole_new" RENAME TO "OrgMemberRole";
DROP TYPE "public"."OrgMemberRole_old";
ALTER TABLE "member" ALTER COLUMN "role" SET DEFAULT 'member';
COMMIT;

-- AlterTable
ALTER TABLE "candidate_application" ADD COLUMN     "questionsHash" TEXT;

-- AlterTable
ALTER TABLE "member" ALTER COLUMN "role" SET DEFAULT 'member';
