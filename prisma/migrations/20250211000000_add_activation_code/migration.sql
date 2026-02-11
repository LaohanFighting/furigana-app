-- CreateTable
CREATE TABLE "ActivationCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "ActivationCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivationCode_code_key" ON "ActivationCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ActivationCode_userId_key" ON "ActivationCode"("userId");

-- AddForeignKey
ALTER TABLE "ActivationCode" ADD CONSTRAINT "ActivationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
