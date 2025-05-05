/*
  Warnings:

  - Added the required column `orderOrder_id` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "orderOrder_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderOrder_id_fkey" FOREIGN KEY ("orderOrder_id") REFERENCES "orders"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;
