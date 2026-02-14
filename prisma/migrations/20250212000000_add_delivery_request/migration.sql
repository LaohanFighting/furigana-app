-- CreateTable
CREATE TABLE "DeliveryRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "contactSuffix" TEXT NOT NULL,
    "contactFull" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "activationCodeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedAt" TIMESTAMP(3),

    CONSTRAINT "DeliveryRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryRequest_activationCodeId_key" ON "DeliveryRequest"("activationCodeId");

-- AddForeignKey
ALTER TABLE "DeliveryRequest" ADD CONSTRAINT "DeliveryRequest_activationCodeId_fkey" FOREIGN KEY ("activationCodeId") REFERENCES "ActivationCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
