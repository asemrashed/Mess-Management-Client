-- AlterTable
ALTER TABLE "MessSettings" ADD COLUMN "managerCanMeals" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MessSettings" ADD COLUMN "managerCanGrocery" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MessSettings" ADD COLUMN "managerCanMealFinance" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MessSettings" ADD COLUMN "managerCanRent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MessSettings" ADD COLUMN "managerCanWifi" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MessSettings" ADD COLUMN "managerCanUtilities" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MessSettings" ADD COLUMN "managerCanOtherBills" BOOLEAN NOT NULL DEFAULT false;
