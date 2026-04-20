-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('GLASSES', 'SUNGLASSES', 'CONTACT_LENS', 'FRAME', 'LENS');

-- CreateTable
CREATE TABLE "VirtualTryon" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "clientId" TEXT,
    "centreId" TEXT NOT NULL,
    "cameraImageUrl" TEXT,
    "resultImageUrl" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "faceFrame" JSONB,
    "productType" "ProductType" NOT NULL DEFAULT 'GLASSES',
    "notes" TEXT,
    "tryonDuration" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VirtualTryon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VirtualTryon_centreId_idx" ON "VirtualTryon"("centreId");
CREATE INDEX "VirtualTryon_clientId_idx" ON "VirtualTryon"("clientId");
CREATE INDEX "VirtualTryon_productId_idx" ON "VirtualTryon"("productId");
CREATE INDEX "VirtualTryon_createdAt_idx" ON "VirtualTryon"("createdAt");

-- AddForeignKey
ALTER TABLE "VirtualTryon" ADD CONSTRAINT "VirtualTryon_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VirtualTryon" ADD CONSTRAINT "VirtualTryon_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "Centre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VirtualTryon" ADD CONSTRAINT "VirtualTryon_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
