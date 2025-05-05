-- CreateTable
CREATE TABLE "balances" (
    "balance_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "balances_pkey" PRIMARY KEY ("balance_id")
);

-- CreateTable
CREATE TABLE "limits" (
    "limit_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "generate_limit" INTEGER NOT NULL DEFAULT 0,
    "analyze_limit" INTEGER NOT NULL DEFAULT 0,
    "chat_limit" INTEGER NOT NULL DEFAULT 15,
    "chat_last_used_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "limits_pkey" PRIMARY KEY ("limit_id")
);
