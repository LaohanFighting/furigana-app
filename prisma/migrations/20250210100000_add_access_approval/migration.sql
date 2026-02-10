-- AlterTable: 使用权限审批 + 管理员
ALTER TABLE "User" ADD COLUMN "accessStatus" TEXT;
ALTER TABLE "User" ADD COLUMN "accessRequestedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "accessApprovedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "accessRejectReason" TEXT;
ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;
