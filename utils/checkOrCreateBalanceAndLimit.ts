import prisma from "./prisma"

export async function checkOrCreateBalanceAndLimit(userId: string) {
    await prisma.$connect()
    let limit = await prisma.limit.findUnique({
        where: {
            user_id: userId
        }
    })
    if (!limit) {
        limit = await prisma.limit.create({
            data: {
                user_id: userId,
            }
        })
    }
    let balance = await prisma.balance.findUnique({
        where: {
            user_id: userId
        }
    })
    if (!balance) {
        balance = await prisma.balance.create({
            data: {
                user_id: userId,
            }
        })
    }
    return {
        limit,
        balance
    }
}