-- User: email optional, add phone (optional, unique)
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- Verification: email optional, add phone (optional)
ALTER TABLE "Verification" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "Verification" ADD COLUMN "phone" TEXT;
