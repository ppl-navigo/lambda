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
    }
    return balance
}