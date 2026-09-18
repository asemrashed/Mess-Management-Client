-- AlterEnum
ALTER TYPE "InvitationStatus" ADD VALUE 'ACCEPTED';

-- AlterTable
ALTER TABLE "MessInvitation" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "email" TEXT;

-- CreateTable
CREATE TABLE "GroceryPurchaseItem" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GroceryPurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroceryPurchaseItem_purchaseId_idx" ON "GroceryPurchaseItem"("purchaseId");

-- CreateIndex
CREATE INDEX "MessInvitation_messId_email_idx" ON "MessInvitation"("messId", "email");

-- AddForeignKey
ALTER TABLE "GroceryPurchaseItem" ADD CONSTRAINT "GroceryPurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "GroceryPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
