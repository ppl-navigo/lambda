import { sha512 } from "@/utils/sha512"
import prisma from "./prisma"

export async function checkOrCreateBalance(userId: string) {
    await prisma.$connect()
    let balance = await prisma.balance.findUnique({
        where: {
            user_id: userId
        }
    })
    if (!balance) {
        balance = await prisma.balance.create({
            data: {
                user_id: userId,
                amount: process.env.INITIAL_BALANCE ? parseFloat(process.env.INITIAL_BALANCE) : 0,
            }
        })
        if (+(process.env.INITIAL_BALANCE ?? 0) > 0) {
            await prisma.payment.create({
                data: {
                    currency: "IDR",
                    gross_amount: +(process.env.INITIAL_BALANCE ?? 0),
                    status: "settlement",
                    payment_type: "bonus",
                    transaction_time: new Date(),
                    transaction_status: "settlement",
                    order_id: `initial_balance_${userId}`,
                    signature_key: sha512(`initial_balance_${userId}200${+(process.env.INITIAL_BALANCE ?? 0)}${process.env.MIDTRANS_SERVER_KEY}`),
                    order: {
                        create: {
                            order_id: `initial_balance_${userId}`,
                            amount: +(process.env.INITIAL_BALANCE ?? 0),
                            user_id: userId,
                            payment_link: "",
                        }
                    }

                }
            })
        }
    }
    return balance
}