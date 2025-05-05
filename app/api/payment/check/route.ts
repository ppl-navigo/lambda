import { NextResponse } from "next/server"
import { jwtDecode } from "jwt-decode";
import prisma from "@/utils/prisma";
import { checkOrCreateBalanceAndLimit } from "@/utils/checkOrCreateBalanceAndLimit";

export async function OPTIONS() {
    const response = NextResponse.json({ status: 200 })
    response.headers.set("Access-Control-Allow-Origin", "*")
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return response
}

export async function GET(request: Request) {
    const headers = request.headers
    const jwt = headers.get("Authorization")?.split(" ")[1]

    if (!jwt) {
        return NextResponse.json({ error: "Missing JWT Token!" }, { status: 401 })
    }

    const { sub } = jwtDecode(jwt)
    if (!sub) {
        return NextResponse.json({ error: "Invalid JWT Token!" }, { status: 401 })
    }

    // try {
    await prisma.$connect()
    const orders = await prisma.order.findMany({
        where: {
            user_id: sub
        },
        include: {
            payments: true
        }
    })

    const { balance, limit } = await checkOrCreateBalanceAndLimit(sub)
    return NextResponse.json({
        status: 200,
        data: {
            limit,
            balance,
            orders
        }
    })
}